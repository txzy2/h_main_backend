import {ExpressAdapter} from '@bull-board/express';
import {BullBoardModule} from '@bull-board/nestjs';
import {BullModule} from '@nestjs/bullmq';
import {ArgumentsHost, Catch, ExceptionFilter, HttpException, Module} from '@nestjs/common';
import {ConfigModule, ConfigService} from '@nestjs/config';
import {ScheduleModule} from '@nestjs/schedule';
import {Response} from 'express';

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
            adapter: ExpressAdapter
        }),
        ...BULL_BOARD_FEATURES,
        ScheduleModule.forRoot(),
        UserModule
    ],
    controllers: [AppController],
    providers: [AppService]
})
export class AppModule {}

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
    catch(exception: HttpException, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response<any>>();

        const exceptionResponse = exception.getResponse();

        const message =
            typeof exceptionResponse === 'string'
                ? exceptionResponse
                : (exceptionResponse as any).message;

        response.status(exception.getStatus()).json({
            success: false,
            error: message
        });
    }
}
