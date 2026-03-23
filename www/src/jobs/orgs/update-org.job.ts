import {CommonHttpService} from '@/common/http/http.service';
import {AppLoggerService} from '@/common/logger/logger.service';
import {Processor, WorkerHost} from '@nestjs/bullmq';
import {ConfigService} from '@nestjs/config';
import {Job} from 'bullmq';
import {UpdateOrgEmailPayload} from '../types';
import {generateMailXSignature} from '@/common/helpers/mail.helper';
import {InternalServerErrorException} from '@nestjs/common';
import {ApiErrors} from '@/common/errors/api-errors';

@Processor('update-org')
export class UpdateOrgJob extends WorkerHost {
    public constructor(
        private readonly logger: AppLoggerService,
        private readonly httpService: CommonHttpService,
        private readonly configSerivce: ConfigService
    ) {
        super();
        this.logger.setContext(UpdateOrgJob.name);
    }

    public async process(job: Job<UpdateOrgEmailPayload>): Promise<void> {
        this.logger.debugWithMeta(`Sending email to`, job.data);

        const timestamp = Math.floor(Date.now() / 1000).toString();
        const sendData = {
            email: job.data.email,
            updated_data: job.data.updatedData ?? {},
            type: job.data.type
        };

        this.logger.debugWithMeta(`Sending email to ${sendData.email}`, {
            data: sendData,
            service_url: this.configSerivce.get<string>('services.mail_service_url')
        });

        try {
            const response = await this.httpService.post<{success: boolean}>(
                `${this.configSerivce.get<string>('services.mail_service_url')}/send-mail`,
                sendData,
                undefined,
                {
                    'Content-Type': 'application/json',
                    'X-Signature': generateMailXSignature({
                        body: JSON.stringify(sendData),
                        path: 'api/v1/send-mail',
                        method: 'POST',
                        timestamp,
                        secret: this.configSerivce.get<string>('secrets.mail') as string
                    }),
                    'X-Timestamp': timestamp
                }
            );

            if (!response.success) {
                this.logger.error(`Failed to send email 1 to ${job.data.email}`);
                throw new Error('Failed to send email');
            }

            this.logger.log(`Email sent to ${job.data.email}`);
        } catch (e) {
            const err = e as Error & {code?: string; response?: {data?: unknown}};
            this.logger.error(
                `Failed to send email 2 to ${job.data.email}, ERROR: ${JSON.stringify({
                    message: err?.message,
                    stack: err?.stack,
                    code: err?.code,
                    response: err?.response?.data
                })}`
            );
            throw new InternalServerErrorException(ApiErrors.INTERNAL_SERVER_ERROR);
        }
    }
}
