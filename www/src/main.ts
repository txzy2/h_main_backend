import {NestFactory} from '@nestjs/core';
import {AppModule, HttpExceptionFilter} from './app.module';
import {ConfigService} from '@nestjs/config';
import {DocumentBuilder, SwaggerModule} from '@nestjs/swagger';

import * as dotenv from 'dotenv';
import {ValidationPipe} from '@nestjs/common';

dotenv.config();

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    const configService = app.get(ConfigService);

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true, // удаляет поля, которых нет в DTO
            forbidNonWhitelisted: true, // выбрасывает ошибку, если есть лишние поля
            transform: true, // автоматически преобразует типы
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
    await app.listen(configService.get<number>('port') ?? 3000);
}
bootstrap();
