import {createHmac} from 'crypto';

export type MailSignaturePayload = {
    body: string;
    path: string;
    method: string;
    timestamp: string;
    secret: string;
};

export const generateMailXSignature = (data: MailSignaturePayload): string => {
    const {body, path, method, timestamp, secret} = data;

    return createHmac('sha256', secret)
        .update(method + path + timestamp + body.toString())
        .digest('hex');
};
