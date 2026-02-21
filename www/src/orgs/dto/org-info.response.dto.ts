import {Prisma} from '@prisma/client';

export type OrgResponseDto = Prisma.OrganizationGetPayload<{
    include: {locations: true};
}>;
