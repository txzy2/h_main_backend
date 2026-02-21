import {SetMetadata} from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Задаёт список ролей, допустимых для доступа к обработчику.
 * Используется вместе с RolesGuard. Роль пользователя берётся из request.user (сервис аутентификации).
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
