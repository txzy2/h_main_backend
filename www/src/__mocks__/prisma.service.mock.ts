import {PrismaService} from '@/infrastructure/prisma/prisma.service';

export const mockPrismaService: jest.Mocked<
    Pick<PrismaService, '$transaction' | 'runTransaction'>
> = {
    $transaction: jest.fn(),
    runTransaction: jest.fn(fn => fn({} as any))
} as any;
