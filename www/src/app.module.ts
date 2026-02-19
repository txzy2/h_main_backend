import {Module} from '@nestjs/common';
import {AppController} from './app.controller';
import {AppService} from './app.service';
import {ConfigModule, ConfigService} from '@nestjs/config';
import conf, {validationSchema} from './core/conf';
import {PrismaModule} from './prisma/prisma.module';
import {OrgsModule} from './orgs/orgs.module';
import {RedisModule} from './redis/redis.module';
import {BullModule} from '@nestjs/bullmq';
import {ScheduleModule} from '@nestjs/schedule';
import {LicensesModule} from './licenses/licenses.module';
import {LoggerModule} from './common/logger/logger.module';
import {LicensesJobModule} from './jobs/licenses/licenses.job.module';

import {BullBoardModule} from '@bull-board/nestjs';
import {BullMQAdapter} from '@bull-board/api/bullMQAdapter';
import {ExpressAdapter} from '@bull-board/express';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const basicAuth = require('express-basic-auth');

@Module({
    imports: [
        ConfigModule.forRoot({
            envFilePath: '.env',
            isGlobal: true,
            load: [conf],
            validationSchema
        }),
        PrismaModule,
        OrgsModule,
        RedisModule,
        LoggerModule,
        LicensesModule,
        LicensesJobModule,
        BullModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => ({
                connection: {
                    url: configService.get<string>('redis.url')
                }
            }),
            inject: [ConfigService]
        }),
        BullModule.registerQueue({name: 'licenses'}),
        BullBoardModule.forRoot({
            route: '/queues',
            adapter: ExpressAdapter,
            middleware: basicAuth({
                users: {
                    [process.env.BULL_BOARD_USER!]: process.env.BULL_BOARD_PASSWORD!
                },
                challenge: true
            })
        }),
        BullBoardModule.forFeature({
            name: 'licenses',
            adapter: BullMQAdapter
        }),
        ScheduleModule.forRoot()
    ],
    controllers: [AppController],
    providers: [AppService]
})
export class AppModule {}
