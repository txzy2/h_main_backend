import {CommonHttpService} from '@/common/http/http.service';
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
        private readonly httpService: CommonHttpService
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const token = request.headers.authorization?.split(' ')[1];

        if (!token) throw new UnauthorizedException('Токен не предоставлен');

        try {
            const user = await this.httpService.get<{success: boolean; data: AuthUser}>(
                `${this.configService.get('services.auth_service_url')}/user/me`,
                token
            );

            request.user = user.data;
            return true;
        } catch (error) {
            // сервис аутентификации вернул 401 — токен невалидный или истёк
            if (error.response?.status === 401) {
                throw new UnauthorizedException('Токен недействителен или истёк');
            }

            // сервис аутентификации недоступен
            if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
                throw new ServiceUnavailableException('Сервис аутентификации недоступен');
            }

            console.log(error);

            // всё остальное
            throw new InternalServerErrorException('Ошибка аутентификации');
        }
    }
}
