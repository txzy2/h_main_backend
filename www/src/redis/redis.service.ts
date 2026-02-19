import {Injectable, OnModuleDestroy, OnModuleInit} from '@nestjs/common';
import {ConfigService} from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
    private client: Redis;
    private subscriber: Redis;

    public constructor(private readonly configService: ConfigService) {}

    public onModuleInit() {
        const url = this.configService.get<string>('redis.url');
        if (!url || url === undefined) {
            throw new Error('Redis URL is not defined');
        }

        this.client = new Redis(url);
        // отдельный инстанс для subscribe — redis не позволяет
        // использовать один клиент и для pub и для sub
        this.subscriber = new Redis(url);
    }

    public async onModuleDestroy() {
        await this.client.quit();
        await this.subscriber.quit();
    }

    public async publish(channel: string, message: unknown): Promise<void> {
        await this.client.publish(channel, JSON.stringify(message));
    }

    public async subscribe(channel: string, handler: (message: unknown) => void): Promise<void> {
        await this.subscriber.subscribe(channel);

        this.subscriber.on('message', (chan, message) => {
            if (chan === channel) {
                handler(JSON.parse(message));
            }
        });
    }

    public async get(key: string): Promise<string | null> {
        return this.client.get(key);
    }

    public async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
        if (ttlSeconds) {
            await this.client.set(key, value, 'EX', ttlSeconds);
        } else {
            await this.client.set(key, value);
        }
    }

    public async del(key: string): Promise<void> {
        await this.client.del(key);
    }
}
