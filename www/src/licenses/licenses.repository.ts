import {PrismaService} from '@/prisma/prisma.service';
import {LicenseWithOrg} from '@/types';

import {Injectable} from '@nestjs/common';
import {Activity} from '@prisma/client';

export const LICENSES_REPOSITORY = Symbol('LICENSES_REPOSITORY');

export interface LicensesRepositoryInterface {
    findExpiringLicenses(): Promise<LicenseWithOrg[]>;
}

@Injectable()
export class LicensesRepository implements LicensesRepositoryInterface {
    public constructor(private readonly prisma: PrismaService) {}

    /**
     * findExpiringLicenses - Поиск организации по id
     *
     * @returns {}
     */
    public async findExpiringLicenses(): Promise<LicenseWithOrg[]> {
        return await this.prisma.license.findMany({
            where: {
                expiredAt: {
                    lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                },
                active: Activity.Active
            },
            include: {org: true}
        });
    }
}
