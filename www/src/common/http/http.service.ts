import {HttpService} from '@nestjs/axios';
import {Injectable} from '@nestjs/common';
import {ConfigService} from '@nestjs/config';
import {AppLoggerService} from '@/common/logger/logger.service';
import {AxiosRequestConfig} from 'axios';

@Injectable()
export class CommonHttpService {
    public constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
        private readonly logger: AppLoggerService
    ) {
        this.logger.setContext(CommonHttpService.name);
    }

    /**
     * Executes a GET request
     *
     * @param url - URL for the request
     * @param token - Optional token to be used for authorization
     *
     * @returns Promise with the response data
     */
    public async get<T>(url: string, token?: string): Promise<T> {
        this.logger.debug(`HTTP GET request: url=${url}, hasToken=${Boolean(token).toString()}`);

        const {data} = await this.httpService.axiosRef.get<T>(url, {
            headers: token ? {Authorization: `Bearer ${token}`} : {}
        });

        this.logger.debug(`HTTP GET response received: url=${url}`);

        return data;
    }

    /**
     * Executes a POST request
     *
     * @param {string} url - URL for the request
     * @param {unknown} body - Data to be sent with the request
     * @param {string} token - Optional token to be used for authorization
     * @param {Record<string, string>} customHeaders - Optional custom headers to be sent with the request
     *
     * @returns Promise with the response data
     */
    public async post<T>(
        url: string,
        body: unknown,
        token?: string,
        customHeaders?: Record<string, string>
    ): Promise<T> {
        this.logger.debug(`HTTP POST: ${url}, hasToken=${Boolean(token)}`);
        this.logger.debug(`HTTP POST body: ${JSON.stringify(body)}`);

        // 1. Базовые заголовки
        const headers: Record<string, string> = {
            'Content-Type': 'application/json'
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        if (customHeaders) {
            Object.assign(headers, customHeaders);
        }

        const config: AxiosRequestConfig = {headers};

        const {data} = await this.httpService.axiosRef.post<T>(url, body, config);

        this.logger.debug(`HTTP POST response: ${url}`);
        return data;
    }

    public async patch<T>(url: string, body: unknown, token?: string): Promise<T> {
        this.logger.debug(`HTTP PATCH request: url=${url}, hasToken=${Boolean(token).toString()}`);

        const {data} = await this.httpService.axiosRef.patch<T>(url, body, {
            headers: token ? {Authorization: `Bearer ${token}`} : {}
        });

        this.logger.debug(`HTTP PATCH response received: url=${url}`);

        return data;
    }
}
