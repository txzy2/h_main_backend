import {LicenseWithOrg} from '@/types';
import {Activity, License} from '@prisma/client';

export const mockCreateLicnseDto: License = {
    id: 1,
    planId: 1,
    orgId: 1,
    active: Activity.Active,
    expiredAt: new Date(),
    createdAt: new Date()
};

export const mockExpiredLicnseDto: LicenseWithOrg[] = [
    {
        id: 1,
        planId: 1,
        orgId: 1,
        active: Activity.Active,
        expiredAt: new Date(),
        createdAt: new Date(),
        org: {
            id: 1,
            uniqueHash: '123',
            name: 'Test Org',
            inn: '1234567890',
            kpp: '123456789',
            director: 'Ivan Ivanov',
            status: 'Pending',
            updatedBy: 'Anton',
            createdAt: new Date(),
            updatedAt: new Date()
        }
    }
];
