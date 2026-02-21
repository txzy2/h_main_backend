export const ApiErrors = {
    INTERNAL_SERVER_ERROR: 'Внутренняя ошибка сервера',
    USER_NOT_FOUND: 'Пользователь не найден или не активен',
    USER_ALREADY_EXIST: 'Пользователь уже зарегистрирован',
    ORG_IS_ALREADY_EXIST: 'Организация уже зарегистрирована',
    ORG_STATUS_IS_PENDING: 'Организация находится на проверке',
    ORG_NOT_FOUND_OR_INACTIVE:
        'Данному пользователю не принадлежит ни одна организация или она не активна',
    USER_NOT_FOUND_BY_PARAM: (param: string) => `Пользователь по параметру "${param}" не найден`,
    TOKEN_IS_EXPIRED: 'Токен недействителен или истёк',
    TARIF_PLAN_NOT_FOUND: 'Выбранный тарифный план не найден',
    TOKEN_NOT_PROVIDED: 'Токен не предоставлен',
    AUTH_SERVICE_UNAVAILABLE: 'Сервис аутентификации недоступен',
    LOCATION_IS_ALREADY_EXIST: (name: string) => `Точка ${name} уже зарегистрирована`,
    ACCESS_DENIED: 'Недостаточно прав для выполнения действия'
} as const;

export type ApiErrors = Extract<(typeof ApiErrors)[keyof typeof ApiErrors], string>;
