import {PrismaService} from '@/prisma/prisma.service';

export const mockPrismaService: jest.Mocked<Pick<PrismaService, 'runTransaction'>> = {
    runTransaction: jest.fn(fn => fn({} as any))
} as any;
