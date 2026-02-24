import {Injectable, OnModuleDestroy, OnModuleInit} from '@nestjs/common';
import {ConfigService} from '@nestjs/config';
import Redis from 'ioredis';
import {AppLoggerService} from '@/common/logger/logger.service';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
    private client: Redis;
    private subscriber: Redis;

    public constructor(
        private readonly configService: ConfigService,
        private readonly logger: AppLoggerService
    ) {
        this.logger.setContext(RedisService.name);
    }

    public onModuleInit() {
        const url = this.configService.get<string>('redis.url');
        if (!url || url === undefined) {
            this.logger.error('Redis URL is not defined');
            throw new Error('Redis URL is not defined');
        }

        this.logger.log('Initializing Redis clients');
        this.client = new Redis(url);
        // отдельный инстанс для subscribe — redis не позволяет
        // использовать один клиент и для pub и for sub
        this.subscriber = new Redis(url);
    }

    public async onModuleDestroy() {
        this.logger.log('Shutting down Redis clients');
        await this.client.quit();
        await this.subscriber.quit();
    }

    public async publish(channel: string, message: unknown): Promise<void> {
        this.logger.debug(`Publishing message to Redis channel: ${channel}`);
        await this.client.publish(channel, JSON.stringify(message));
    }

    public async subscribe(channel: string, handler: (message: unknown) => void): Promise<void> {
        this.logger.log(`Subscribing to Redis channel: ${channel}`);
        await this.subscriber.subscribe(channel);

        this.subscriber.on('message', (chan, message) => {
            if (chan === channel) {
                this.logger.debug(`Received message from Redis channel: ${chan}`);
                handler(JSON.parse(message));
            }
        });
    }

    public async get(key: string): Promise<string | null> {
        this.logger.debug(`Redis GET: key=${key}`);
        return this.client.get(key);
    }

    public async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
        this.logger.debug(`Redis SET: key=${key}, ttlSeconds=${ttlSeconds ?? 'none'}`);
        if (ttlSeconds) {
            await this.client.set(key, value, 'EX', ttlSeconds);
        } else {
            await this.client.set(key, value);
        }
    }

    public async del(key: string): Promise<void> {
        this.logger.debug(`Redis DEL: key=${key}`);
        await this.client.del(key);
    }
}
