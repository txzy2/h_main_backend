import {AppLoggerService} from '@/common/logger/logger.service';

export const mockLoggerService: jest.Mocked<AppLoggerService> = {
    log: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    setContext: jest.fn()
} as any;
