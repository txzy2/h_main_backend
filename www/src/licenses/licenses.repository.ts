import {BUSINESS_LIMITS} from '@/core/constants';
import {PrismaService} from '@/prisma/prisma.service';
import {LicenseWithOrg} from '@/types';

import {Injectable} from '@nestjs/common';
import {Activity, Prisma} from '@prisma/client';

export const LICENSES_REPOSITORY = Symbol('LICENSES_REPOSITORY');

export interface LicensesRepositoryInterface {
    findExpiringLicenses(): Promise<LicenseWithOrg[]>;
    register(orgId: number, planId: number, tx?: Prisma.TransactionClient): Promise<boolean>;
}

@Injectable()
export class LicensesRepository implements LicensesRepositoryInterface {
    public constructor(private readonly prisma: PrismaService) {}

    /**
     * findExpiringLicenses - Поиск истекших лицензий
     *
     * @returns {Promise<LicenseWithOrg[]>}
     */
    public async findExpiringLicenses(): Promise<LicenseWithOrg[]> {
        return await this.prisma.license.findMany({
            where: {
                expiredAt: {
                    lte: new Date(Date.now() + BUSINESS_LIMITS.LICENSE_EXPARATION_DAYS)
                },
                active: Activity.Active
            },
            include: {org: true}
        });
    }

    /**
     * register - регистрация лицензии
     *
     * @param {number} orgId
     * @param {number} planId
     *
     * @returns {Promise<boolean>}
     */
    public async register(
        orgId: number,
        planId: number,
        tx?: Prisma.TransactionClient
    ): Promise<boolean> {
        const client = tx ?? this.prisma;
        return !!(await client.license.create({
            data: {
                orgId,
                planId,
                active: Activity.Pending,
                expiredAt: new Date(Date.now() + BUSINESS_LIMITS.CREATE_LICENSE_EXPARATION_DAYS)
            }
        }));
    }
}
