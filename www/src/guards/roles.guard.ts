import {ApiErrors} from '@/common/errors/api-errors';
import {AppLoggerService} from '@/common/logger/logger.service';
import {AuthUser} from '@/types';
import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
    UnauthorizedException
} from '@nestjs/common';
import {Reflector} from '@nestjs/core';

import {ROLES_KEY} from '@/common/decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly logger: AppLoggerService
    ) {
        this.logger.setContext(RolesGuard.name);
    }

    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass()
        ]);

        if (!requiredRoles?.length) return true;

        const request = context.switchToHttp().getRequest();
        const user = request.user as AuthUser | undefined;

        if (!user) {
            this.logger.warn(
                `Access without authenticated user: ${request.method} ${request.path}, requiredRoles=${requiredRoles.join(
                    ','
                )}`
            );
            throw new UnauthorizedException(ApiErrors.TOKEN_IS_EXPIRED);
        }

        const hasRole = requiredRoles.includes(user.role);
        if (!hasRole) {
            this.logger.warn(
                `Access denied by role: ${request.method} ${request.path}, userRole=${user.role}, requiredRoles=${requiredRoles.join(
                    ','
                )}`
            );
            throw new ForbiddenException(ApiErrors.ACCESS_DENIED);
        }

        return true;
    }
}
