import {Prisma} from '@prisma/client';

export type LicenseWithOrg = Prisma.LicenseGetPayload<{
    include: {org: true};
}>;
