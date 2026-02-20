import {HttpService} from '@nestjs/axios';
import {Injectable} from '@nestjs/common';
import {ConfigService} from '@nestjs/config';

@Injectable()
export class CommonHttpService {
    public constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService
    ) {}

    public async get<T>(url: string, token?: string): Promise<T> {
        const {data} = await this.httpService.axiosRef.get<T>(url, {
            headers: token ? {Authorization: `Bearer ${token}`} : {}
        });

        return data;
    }

    public async post<T>(url: string, body: unknown, token?: string): Promise<T> {
        const {data} = await this.httpService.axiosRef.post<T>(url, body, {
            headers: token ? {Authorization: `Bearer ${token}`} : {}
        });

        return data;
    }

    public async patch<T>(url: string, body: unknown, token?: string): Promise<T> {
        const {data} = await this.httpService.axiosRef.patch<T>(url, body, {
            headers: token ? {Authorization: `Bearer ${token}`} : {}
        });

        return data;
    }
}
