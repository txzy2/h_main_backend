import {Injectable, LoggerService, Scope} from '@nestjs/common';
import * as winston from 'winston';
import * as path from 'path';
import * as fs from 'fs';

type LogMeta = Record<string, any>;

@Injectable()
export class AppLoggerService implements LoggerService {
    private logger: winston.Logger;
    private context?: string;

    private baseFormat() {
        return winston.format.combine(
            winston.format.timestamp({format: 'YYYY-MM-DD HH:mm:ss'}),
            winston.format.errors({stack: true}),
            winston.format.printf(({timestamp, level, message, context, ...meta}) => {
                const header =
                    `[${timestamp}] ` +
                    `[${level.toUpperCase()}]` +
                    (context ? ` [${context}]` : '');

                const metaClean = Object.fromEntries(
                    Object.entries(meta).filter(([_, v]) => v !== undefined && v !== null)
                );

                return Object.keys(metaClean).length
                    ? `${header} ${message}\n${JSON.stringify(metaClean, null, 2)}`
                    : `${header} ${message}`;
            })
        );
    }

    constructor() {
        this.ensureLogDirs();

        this.logger = winston.createLogger({
            level: 'debug',
            format: winston.format.combine(
                winston.format.timestamp({format: 'YYYY-MM-DD HH:mm:ss'}),
                winston.format.errors({stack: true}),
                winston.format.printf(({timestamp, level, message, context, ...meta}) => {
                    const base = `[${timestamp}] [${level.toUpperCase()}]${
                        context ? ` [${context}]` : ''
                    } ${message}`;

                    return Object.keys(meta).length
                        ? `${base}\n${JSON.stringify(meta, null, 2)}`
                        : base;
                })
            ),
            transports: [
                this.consoleTransport(),
                this.fileTransport('debug'),
                this.fileTransport('info'),
                this.fileTransport('warn'),
                this.fileTransport('error')
            ]
        });
    }

    /**
     * Устанавливает context (обычно имя класса)
     */
    setContext(context: string) {
        this.context = context;
    }

    log(message: string, context?: string) {
        this.logger.info(message, {context: context ?? this.context});
    }

    debug(message: string, context?: string) {
        this.logger.debug(message, {context: context ?? this.context});
    }

    warn(message: string, context?: string) {
        this.logger.warn(message, {context: context ?? this.context});
    }

    error(message: string, trace?: string, context?: string) {
        this.logger.error(message, {
            context: context ?? this.context,
            trace
        });
    }

    debugWithMeta(message: string, meta: Record<string, any>) {
        this.logger.debug(message, {
            context: this.context,
            ...meta
        });
    }

    private getDatePath(): string {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');

        return `${year}/${month}/${day}`;
    }

    private ensureLogDirs() {
        const base = path.join(process.cwd(), 'logs');
        const dateDir = path.join(base, this.getDatePath());

        fs.mkdirSync(dateDir, {recursive: true});
    }

    private fileTransport(level: string) {
        return new winston.transports.File({
            filename: path.join(process.cwd(), 'logs', this.getDatePath(), `${level}.log`),
            level
        });
    }

    private consoleTransport() {
        return new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize({all: true}),
                winston.format.timestamp({format: 'YYYY-MM-DD HH:mm:ss'}),
                winston.format.printf(({timestamp, level, message, context, ...meta}) => {
                    const base = `[${timestamp}] [${level}]${
                        context ? ` [${context}]` : ''
                    } ${message}`;

                    return Object.keys(meta).length
                        ? `${base}\n${JSON.stringify(meta, null, 2)}`
                        : base;
                })
            )
        });
    }
}
