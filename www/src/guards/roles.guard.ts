import {ApiErrors} from '@/common/errors/api-errors';
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
    constructor(private readonly reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass()
        ]);

        if (!requiredRoles?.length) return true;

        const request = context.switchToHttp().getRequest();
        const user = request.user as AuthUser | undefined;

        if (!user) {
            throw new UnauthorizedException(ApiErrors.TOKEN_IS_EXPIRED);
        }

        const hasRole = requiredRoles.includes(user.role);
        if (!hasRole) {
            throw new ForbiddenException(ApiErrors.ACCESS_DENIED);
        }

        return true;
    }
}
