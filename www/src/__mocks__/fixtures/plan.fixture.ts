import {Plans} from '@prisma/client';

export const mockPlan: Plans = {
    id: 1,
    name: 'basic',
    maxLocations: 3,
    price: 1000,
    description: 'Basic plan'
};
