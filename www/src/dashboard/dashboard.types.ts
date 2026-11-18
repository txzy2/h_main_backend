import {BookingStatus} from '@prisma/client';

export type ShiftBookingStatus = 'Завершена' | 'За столом' | 'Ожидается' | 'Отменена';

export type ShiftStaffStatus = 'На смене' | 'Заканчивает' | 'Скоро';

/** Нормализованная бронь, с которой работает сервис дашборда. */
export interface DashboardBooking {
    id: number;
    locationId: number;
    locationName: string;
    tableId: number | null;
    tableName: string | null;
    userExtId: string;
    guestName: string | null;
    guestPhone: string | null;
    guestsCount: number;
    status: BookingStatus;
    scheduledAt: Date;
    durationMinutes: number;
    seatedAt: Date | null;
    completedAt: Date | null;
    amount: number;
    rating: number | null;
    updatedAt: Date;
}

export interface DashboardUser {
    extId: string;
    name: string;
    position: string | null;
}

export interface DashboardLocation {
    id: number;
    name: string;
    address: string;
    activePlaces: number;
    tablesCount: number;
}

export interface DashboardShift {
    id: number;
    userId: number;
    userExtId: string;
    userName: string;
    userPosition: string | null;
    startsAt: Date;
    endsAt: Date | null;
    bookingsGoal: number;
    actualStartedAt: Date | null;
    actualEndedAt: Date | null;
}

export interface HourLoadPoint {
    hour: string;
    bookings: number;
}

export interface HeatmapData {
    days: string[];
    hours: string[];
    values: number[][];
}

export interface DashboardKpi {
    revenueToday: number;
    revenueMonth: number;
    bookingsToday: number;
    guestsToday: number;
    averageCheck: number;
    occupancy: number;
    newGuestsToday: number;
    returningRate: number;
    revenueTrend: number;
    bookingsTrend: number;
    guestsTrend: number;
    averageCheckTrend: number;
    occupancyTrend: number;
    newGuestsTrend: number;
    spark: {
        revenue: number[];
        bookings: number[];
        guests: number[];
        averageCheck: number[];
        occupancy: number[];
        newGuests: number[];
    };
}

export interface LocationStat {
    id: number;
    name: string;
    address: string;
    revenue: number;
    bookings: number;
    guests: number;
    averageCheck: number;
    occupancy: number;
    trend: number;
}

export interface EmployeeStat {
    id: string;
    name: string;
    role: string;
    bookings: number;
    guests: number;
    revenue: number;
    rating: number;
}

export interface DashboardSummary {
    generatedAt: string;
    kpi: DashboardKpi;
    loadByHour: HourLoadPoint[];
    heatmap: HeatmapData;
    locations: LocationStat[];
    employees: EmployeeStat[];
}

export interface RevenuePoint {
    date: string;
    label: string;
    revenue: number;
    bookings: number;
}

export interface RevenuePeriod {
    key: string;
    label: string;
    points: RevenuePoint[];
}

export interface ShiftBooking {
    id: string;
    time: string;
    endTime: string;
    durationMinutes: number;
    locationName: string;
    guestName: string;
    guests: number;
    table: string;
    status: ShiftBookingStatus;
    phone?: string;
    isMine?: boolean;
}

export interface ShiftStaff {
    id: string;
    name: string;
    role: string;
    timeRange: string;
    status: ShiftStaffStatus;
}

export interface BookingBoardItem extends ShiftBooking {
    managerName: string;
}

export interface EmployeeBookingStat {
    id: string;
    name: string;
    role: string;
    bookings: number;
    guests: number;
    revenue: number;
    averageCheck: number;
    cancellations: number;
}

export interface BookingsBoard {
    generatedAt: string;
    date: string;
    summary: {
        bookings: number;
        guests: number;
        revenue: number;
        cancellations: number;
        expectedArrivals: number;
    };
    bookings: BookingBoardItem[];
    employees: EmployeeBookingStat[];
}

export interface ManagerShiftSummary {
    generatedAt: string;
    kpi: {
        bookingsToday: number;
        guestsToday: number;
        tablesBusy: number;
        tablesTotal: number;
        cancellations: number;
        expectedArrivals: number;
        averageVisitMinutes: number;
        occupancy: number;
    };
    personal: {
        bookings: number;
        guests: number;
        revenue: number;
        averageCheck: number;
        cancellations: number;
        averageVisitMinutes: number;
        goal: number;
        shift: {
            id: number | null;
            isActive: boolean;
            startedAt: string | null;
            endedAt: string | null;
            durationMinutes: number;
            bookings: number;
            guests: number;
            revenue: number;
            averageCheck: number;
            cancellations: number;
            averageVisitMinutes: number;
            goal: number;
        };
    };
    bookings: ShiftBooking[];
    loadByHour: HourLoadPoint[];
    staff: ShiftStaff[];
}
