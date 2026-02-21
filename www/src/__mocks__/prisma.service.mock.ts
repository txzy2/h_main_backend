import {PrismaService} from '@/prisma/prisma.service';

export const mockPrismaService: jest.Mocked<Pick<PrismaService, 'runTransaction'>> = {
    $transaction: jest.fn(),
    runTransaction: jest.fn(fn => fn({} as any))
} as any;
