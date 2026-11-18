import {DASHBOARD_TIME_ZONE} from './dashboard.constants';

const DAY_MS = 24 * 60 * 60 * 1000;

const partsFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: DASHBOARD_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
});

const weekdayFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: DASHBOARD_TIME_ZONE,
    weekday: 'short'
});

const dayLabelFormatter = new Intl.DateTimeFormat('ru-RU', {
    timeZone: DASHBOARD_TIME_ZONE,
    day: 'numeric',
    month: 'short'
});

const WEEKDAY_INDEX: Record<string, number> = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6
};

export interface ZonedParts {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
}

export function getZonedParts(date: Date): ZonedParts {
    const values: Record<string, string> = {};

    for (const part of partsFormatter.formatToParts(date)) {
        if (part.type !== 'literal') values[part.type] = part.value;
    }

    return {
        year: Number(values.year),
        month: Number(values.month),
        day: Number(values.day),
        hour: Number(values.hour),
        minute: Number(values.minute),
        second: Number(values.second)
    };
}

function getOffsetMs(date: Date): number {
    const parts = getZonedParts(date);
    const asUtc = Date.UTC(
        parts.year,
        parts.month - 1,
        parts.day,
        parts.hour,
        parts.minute,
        parts.second
    );

    return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

export function zonedTimeToUtc(
    parts: Pick<ZonedParts, 'year' | 'month' | 'day'> &
        Partial<Pick<ZonedParts, 'hour' | 'minute' | 'second'>>
): Date {
    const utcGuess = Date.UTC(
        parts.year,
        parts.month - 1,
        parts.day,
        parts.hour ?? 0,
        parts.minute ?? 0,
        parts.second ?? 0
    );

    // Двух итераций достаточно даже для зон с переходом на летнее время.
    let timestamp = utcGuess - getOffsetMs(new Date(utcGuess));
    timestamp = utcGuess - getOffsetMs(new Date(timestamp));

    return new Date(timestamp);
}

export function startOfZonedDay(date: Date): Date {
    const parts = getZonedParts(date);

    return zonedTimeToUtc({year: parts.year, month: parts.month, day: parts.day});
}

export function startOfZonedMonth(date: Date): Date {
    const parts = getZonedParts(date);

    return zonedTimeToUtc({year: parts.year, month: parts.month, day: 1});
}

export function addDays(date: Date, days: number): Date {
    return new Date(date.getTime() + days * DAY_MS);
}

export function addMonths(date: Date, months: number): Date {
    const parts = getZonedParts(date);
    const target = new Date(Date.UTC(parts.year, parts.month - 1 + months, 1));

    return zonedTimeToUtc({
        year: target.getUTCFullYear(),
        month: target.getUTCMonth() + 1,
        day: 1
    });
}

export function formatDateKey(date: Date): string {
    const parts = getZonedParts(date);

    return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

export function formatDayLabel(date: Date): string {
    return dayLabelFormatter.format(date);
}

export function formatHourLabel(hour: number): string {
    return `${pad(hour)}:00`;
}

export function getHour(date: Date): number {
    return getZonedParts(date).hour;
}

export function getWeekdayIndex(date: Date): number {
    return WEEKDAY_INDEX[weekdayFormatter.format(date)] ?? 0;
}

export function formatTime(date: Date): string {
    const parts = getZonedParts(date);

    return `${pad(parts.hour)}:${pad(parts.minute)}`;
}

export function formatTimeRange(start: Date, end: Date | null): string {
    return `${formatTime(start)} – ${end ? formatTime(end) : '—'}`;
}

function pad(value: number): string {
    return String(value).padStart(2, '0');
}
