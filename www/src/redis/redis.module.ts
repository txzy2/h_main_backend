import {Global, Module} from '@nestjs/common';
import {RedisService} from './redis.service';
import {LoggerModule} from '@/common/logger/logger.module';

@Global()
@Module({
    imports: [LoggerModule],
    providers: [RedisService],
    exports: [RedisService]
})
export class RedisModule {}
