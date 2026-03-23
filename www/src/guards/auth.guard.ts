import {ApiErrors} from '@/common/errors/api-errors';
import {CommonHttpService} from '@/common/http/http.service';
import {AppLoggerService} from '@/common/logger/logger.service';
import {AuthUser} from '@/types';
import {
    CanActivate,
    ExecutionContext,
    Injectable,
    InternalServerErrorException,
    ServiceUnavailableException,
    UnauthorizedException
} from '@nestjs/common';
import {ConfigService} from '@nestjs/config';

@Injectable()
export class AuthGuard implements CanActivate {
    public constructor(
        private readonly configService: ConfigService,
        private readonly httpService: CommonHttpService,
        private readonly logger: AppLoggerService
    ) {
        this.logger.setContext(AuthGuard.name);
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const token = request.headers.authorization?.split(' ')[1];

        if (!token) {
            this.logger.warn(`Token not provided: ${request.method} ${request.path}`);
            throw new UnauthorizedException(ApiErrors.TOKEN_NOT_PROVIDED);
        }

        const url = `${this.configService.get('services.auth_service_url')}/user/me`;
        this.logger.debug(`Requesting current user from auth service: ${url}`);

        try {
            const user = await this.httpService.get<{success: boolean; data: AuthUser}>(url, token);

            this.logger.log(`User authenticated: sub=${user.data.sub}, role=${user.data.role}`);

            request.user = user.data;
            return true;
        } catch (error) {
            // сервис аутентификации вернул 401 — токен невалидный или истёк
            if (error.response?.status === 401) {
                this.logger.warn(`Token is expired or invalid: ${request.method} ${request.path}`);
                throw new UnauthorizedException(ApiErrors.TOKEN_IS_EXPIRED);
            }

            // сервис аутентификации недоступен
            if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
                this.logger.error(`Auth service is unavailable: code=${error.code}, url=${url}`);
                throw new ServiceUnavailableException(ApiErrors.AUTH_SERVICE_UNAVAILABLE);
            }

            this.logger.error('Unexpected authentication error', error?.stack);

            // всё остальное
            throw new InternalServerErrorException('Ошибка аутентификации');
        }
    }
}
