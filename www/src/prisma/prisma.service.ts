import {Injectable, OnModuleDestroy, OnModuleInit} from '@nestjs/common';
import {PrismaPg} from '@prisma/adapter-pg';
import {Prisma, PrismaClient} from '@prisma/client';

@Injectable()
export class PrismaService
    extends PrismaClient<{adapter: PrismaPg}>
    implements OnModuleInit, OnModuleDestroy
{
    constructor() {
        super({
            adapter: new PrismaPg({
                connectionString: process.env.DATABASE_URL as string
            })
        });
    }

    async onModuleInit() {
        await this.$connect();
    }

    async onModuleDestroy() {
        await this.$disconnect();
    }

    async runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
        return this.$transaction(fn);
    }
}
