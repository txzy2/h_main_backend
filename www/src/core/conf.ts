import * as Joi from 'joi';

export const validationSchema = Joi.object({
    APP_PORT: Joi.number().default(3000),
    DATABASE_URL: Joi.string().required(),
    REDIS_URL: Joi.string().required()
});

export default () => ({
    port: parseInt(process.env.APP_PORT ?? '3000', 10),
    database: {
        url: process.env.DATABASE_URL ?? 'localhost'
    },
    redis: {
        url: process.env.REDIS_URL ?? 'redis://localhost:6379'
    }
});
