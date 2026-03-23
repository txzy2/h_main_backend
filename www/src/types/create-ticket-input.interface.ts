import {RequestStatus} from '@prisma/client';

export interface CreateTicketInput {
    ticketId: string;
    orgId: number;
    typeId: number;
    requestedData: unknown;
    reason?: string | null;
    status: RequestStatus;
    email: string;
    userExtId: string;
}
