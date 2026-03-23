import {NestFactory} from '@nestjs/core';
import {FastifyAdapter, NestFastifyApplication} from '@nestjs/platform-fastify';
import {AppModule} from './app.module';
import {ConfigService} from '@nestjs/config';
import {DocumentBuilder, SwaggerModule} from '@nestjs/swagger';
import {ValidationPipe} from '@nestjs/common';
import {HttpExceptionFilter} from './common/filters/http-exception.filter';
import * as dotenv from 'dotenv';
dotenv.config();

async function bootstrap() {
    const app = await NestFactory.create<NestFastifyApplication>(
        AppModule,
        new FastifyAdapter({
            logger: false
        })
    );

    const configService = app.get(ConfigService);

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
            transformOptions: {
                enableImplicitConversion: true
            },
            skipMissingProperties: false
        })
    );

    app.setGlobalPrefix('api/v1');

    const config = new DocumentBuilder()
        .setTitle('HookahBooking main service')
        .setDescription('This is service for hookah project. It allows to book hookah sessions.')
        .setVersion('1.0')
        .addBearerAuth(
            {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                name: 'JWT',
                description: 'JWT токен полученный от сервиса авторизации',
                in: 'header'
            },
            'JWT-auth'
        )
        .build();

    const documentFactory = () => SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('/docs', app, documentFactory);

    app.useGlobalFilters(new HttpExceptionFilter());

    // Fastify по умолчанию слушает только localhost — для Docker нужен '0.0.0.0'
    await app.listen(configService.get<number>('port') ?? 3000, '0.0.0.0');
}
bootstrap();
