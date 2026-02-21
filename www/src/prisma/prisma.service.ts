import {Injectable, OnModuleDestroy, OnModuleInit} from '@nestjs/common';
import {PrismaPg} from '@prisma/adapter-pg';
import {Prisma, PrismaClient} from '@prisma/client';
import {AppLoggerService} from '@/common/logger/logger.service';

@Injectable()
export class PrismaService
    extends PrismaClient<{adapter: PrismaPg}>
    implements OnModuleInit, OnModuleDestroy
{
    constructor(private readonly logger: AppLoggerService) {
        super({
            adapter: new PrismaPg({
                connectionString: process.env.DATABASE_URL as string
            })
        });

        this.logger.setContext(PrismaService.name);
    }

    async onModuleInit() {
        this.logger.log('Connecting to database');
        await this.$connect();
        this.logger.log('Database connection established');
    }

    async onModuleDestroy() {
        this.logger.log('Disconnecting from database');
        await this.$disconnect();
        this.logger.log('Database connection closed');
    }

    async runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
        this.logger.debug('Starting Prisma transaction');
        const result = await this.$transaction(fn);
        this.logger.debug('Prisma transaction finished');
        return result;
    }
}
