import {Injectable} from '@nestjs/common';
import {PrismaPg} from '@prisma/adapter-pg';
import {PrismaClient} from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient<{
    adapter: PrismaPg;
}> {
    constructor() {
        super({
            adapter: new PrismaPg({
                connectionString: process.env.DATABASE_URL as string
            })
        });
    }
}
