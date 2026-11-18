import {BookingActionType, BookingStatus} from '@prisma/client';

export interface BookingActionDto {
    id: number;
    type: BookingActionType;
    minutes: number | null;
    amount: number | null;
    comment: string | null;
    createdAt: string;
}

export interface BookingDetailsDto {
    id: number;
    locationId: number;
    locationName: string;
    tableId: number | null;
    tableName: string | null;
    guestName: string | null;
    guestPhone: string | null;
    guestsCount: number;
    status: BookingStatus;
    scheduledAt: string;
    durationMinutes: number;
    expectedEndAt: string;
    seatedAt: string | null;
    completedAt: string | null;
    amount: number;
    rating: number | null;
    comment: string | null;
    userExtId: string;
    createdByName: string | null;
    isMine: boolean;
    createdAt: string;
    actions: BookingActionDto[];
}
