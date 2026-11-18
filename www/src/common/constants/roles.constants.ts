/**
 * Константы ролей пользователей.
 * Значения должны совпадать с ролями, возвращаемыми сервисом аутентификации.
 */
export const USER_ROLES = {
    ADMIN: 'Admin',
    SUPER_USER: 'SuperUser',
    MANAGER: 'Manager',
    USER: 'User'
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];
