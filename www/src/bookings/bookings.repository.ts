import {Injectable} from '@nestjs/common';

export const BOOKINGS_REPOSITORY = Symbol('BOOKINGS_REPOSITORY');

export interface IBookingsRepository {
    create(): Promise<void>;
}

@Injectable()
export class BookingsRepository implements IBookingsRepository {
    public async create(): Promise<void> {
        return;
    }
}
