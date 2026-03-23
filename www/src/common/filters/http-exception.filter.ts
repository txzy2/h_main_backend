import {ArgumentsHost, Catch, ExceptionFilter, HttpException} from '@nestjs/common';
import {FastifyReply} from 'fastify';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
    catch(exception: HttpException, host: ArgumentsHost): void {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<FastifyReply>();
        const exceptionResponse: unknown = exception.getResponse();

        let errorMessage: string;

        if (typeof exceptionResponse === 'string') {
            errorMessage = exceptionResponse;
        } else if (
            typeof exceptionResponse === 'object' &&
            exceptionResponse !== null &&
            'message' in exceptionResponse
        ) {
            const message = (exceptionResponse as {message: string | string[]}).message;
            errorMessage = Array.isArray(message) ? message.join(', ') : message;
        } else {
            errorMessage = 'Внутренняя ошибка сервера';
        }

        response.status(exception.getStatus()).send({
            success: false,
            error: errorMessage
        } satisfies {success: false; error: string});
    }
}
