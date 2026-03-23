import {BullBoardModule} from '@bull-board/nestjs';
import {BullModule} from '@nestjs/bullmq';
import {Module} from '@nestjs/common';
import {ConfigModule, ConfigService} from '@nestjs/config';
import {ScheduleModule} from '@nestjs/schedule';

import {LoggerModule} from './common/logger/logger.module';
import {LicensesJobModule} from './jobs/licenses/licenses.job.module';
import {LicensesModule} from './licenses/licenses.module';
import {OrgsModule} from './orgs/orgs.module';
import {PrismaModule} from './prisma/prisma.module';
import {RedisModule} from './redis/redis.module';

import {BULL_BOARD_FEATURES} from './core/bull-board/futures';
import conf, {validationSchema} from './core/conf';

import {AppController} from './app.controller';
import {AppService} from './app.service';
import {CommonHttpModule} from './common/http/http.module';
import {UserModule} from './user/user.module';
import {PlansModule} from './plans/plans.module';
import {LocationsModule} from './locations/locations.module';
import {TicketsModule} from './tickets/tickets.module';
import {FastifyAdapter} from '@bull-board/fastify';
import {OrgsJobModule} from './jobs/orgs/orgs.job.module';

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
        PlansModule,
        RedisModule,
        LoggerModule,
        LicensesModule,
        LicensesJobModule,
        OrgsJobModule,
        TicketsModule,
        CommonHttpModule,
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
        //TODO: на проде в nginx конфиге ограничить доступ через пароль
        BullBoardModule.forRoot({
            route: '/queues',
            adapter: FastifyAdapter
        }),
        ...BULL_BOARD_FEATURES,
        ScheduleModule.forRoot(),
        UserModule,
        LocationsModule
    ],
    controllers: [AppController],
    providers: [AppService]
})
export class AppModule {}
