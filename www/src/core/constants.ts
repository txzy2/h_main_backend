/**
 * Redis ключи
 */
export const REDIS_KEYS = {} as const;

/**
 * TTL (Time To Live) для Redis ключей в секундах
 */
export const REDIS_TTL = {} as const;

/**
 * Лимиты для операций
 */
export const REQUESTS_LIMITS = {} as const;

/**
 * Лимиты запросов (Throttle)
 */
export const THROTTLE = {
    DEFAULT_TTL: 60000,
    DEFAULT_LIMIT: 100,

    AUTH_TTL: 60000,
    AUTH_LIMIT: 10,

    BOOKING_TTL: 60000,
    BOOKING_LIMIT: 5
} as const;

/**
 * Лимиты бизнес-логики
 */
export const BUSINESS_LIMITS = {
    MAX_ACTIVE_BOOKINGS_PER_USER: 5,
    MAX_GUESTS_PER_BOOKING: 20,
    LICENSE_EXPARATION_DAYS: 7 * 24 * 60 * 60 * 1000,
    CREATE_LICENSE_EXPARATION_DAYS: 30 * 24 * 60 * 60 * 1000
} as const;
