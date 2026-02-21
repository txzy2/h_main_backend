import {HttpService} from '@nestjs/axios';
import {Injectable} from '@nestjs/common';
import {ConfigService} from '@nestjs/config';
import {AppLoggerService} from '@/common/logger/logger.service';

@Injectable()
export class CommonHttpService {
    public constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
        private readonly logger: AppLoggerService
    ) {
        this.logger.setContext(CommonHttpService.name);
    }

    public async get<T>(url: string, token?: string): Promise<T> {
        this.logger.debug(
            `HTTP GET request: url=${url}, hasToken=${Boolean(token).toString()}`
        );

        const {data} = await this.httpService.axiosRef.get<T>(url, {
            headers: token ? {Authorization: `Bearer ${token}`} : {}
        });

        this.logger.debug(`HTTP GET response received: url=${url}`);

        return data;
    }

    public async post<T>(url: string, body: unknown, token?: string): Promise<T> {
        this.logger.debug(
            `HTTP POST request: url=${url}, hasToken=${Boolean(token).toString()}`
        );

        const {data} = await this.httpService.axiosRef.post<T>(url, body, {
            headers: token ? {Authorization: `Bearer ${token}`} : {}
        });

        this.logger.debug(`HTTP POST response received: url=${url}`);

        return data;
    }

    public async patch<T>(url: string, body: unknown, token?: string): Promise<T> {
        this.logger.debug(
            `HTTP PATCH request: url=${url}, hasToken=${Boolean(token).toString()}`
        );

        const {data} = await this.httpService.axiosRef.patch<T>(url, body, {
            headers: token ? {Authorization: `Bearer ${token}`} : {}
        });

        this.logger.debug(`HTTP PATCH response received: url=${url}`);

        return data;
    }
}
