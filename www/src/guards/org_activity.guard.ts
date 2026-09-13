import {ApiErrors} from '@/common/errors/api-errors';
import {AppLoggerService} from '@/common/logger/logger.service';
import {LicensesService} from '@/licenses/licenses.service';
import {AuthUser} from '@/types';
import {UserService} from '@/user/user.service';
import {
    BadRequestException,
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException
} from '@nestjs/common';
import {Activity} from '@prisma/client';

@Injectable()
export class OrgActivityGuard implements CanActivate {
    public constructor(
        private readonly logger: AppLoggerService,
        private readonly userService: UserService,
        private readonly licenseService: LicensesService
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();

        const user = request.user as AuthUser | undefined;

        if (!user) {
            this.logger.warn('Error get user');
            throw new UnauthorizedException(ApiErrors.TOKEN_IS_EXPIRED);
        }

        const existUser = await this.userService.getUserByParam({extId: user.sub});
        if (!existUser) {
            throw new UnauthorizedException(ApiErrors.USER_NOT_FOUND_BY_PARAM);
        }

        const license = await this.licenseService.getLicenseByOrg(existUser.orgId);

        if (license.org.status !== Activity.Active || license.active !== Activity.Active) {
            throw new BadRequestException(ApiErrors.ORG_STATUS_IS_PENDING);
        }

        return true;
    }
}
