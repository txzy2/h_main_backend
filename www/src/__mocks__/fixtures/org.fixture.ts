import {CreateOrgDto} from '@/orgs/dto/create-org.dto';
import {Organization} from '@prisma/client';

export const mockCreateOrgDto: CreateOrgDto = {
    name: 'Test Org',
    inn: '1234567890',
    kpp: '123456789',
    director: 'Ivan Ivanov',
    phone_number: '89177001742',
    plan: 'basic'
};

export const mockOrganization: Organization = {
    id: 1,
    name: 'Test Org',
    inn: '1234567890',
    kpp: '123456789',
    director: 'Ivan Ivanov',
    status: 'Pending',
    createdAt: new Date(),
    updatedAt: new Date()
};
