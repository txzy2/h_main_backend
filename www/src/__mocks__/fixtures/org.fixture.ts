import {CreateLocationDto} from '@/locations/dto/create-location.dto';
import {CreateOrgDto} from '@/orgs/dto/create-org.dto';
import {OrgResponseDto} from '@/orgs/dto/org-info.response.dto';
import {Activity, Organization} from '@prisma/client';

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
    uniqueHash: 'qwe',
    name: 'Test Org',
    inn: '1234567890',
    kpp: '123456789',
    director: 'Ivan Ivanov',
    status: 'Pending',
    updatedBy: 'anton',
    createdAt: new Date(),
    updatedAt: new Date()
};

/** Организация со статусом Active и пустым массивом локаций (для getActiveOrg / findOrgInfoById) */
export const mockActiveOrgResponse: OrgResponseDto = {
    ...mockOrganization,
    status: Activity.Active,
    locations: []
};

export const mockCreateLocationDto: CreateLocationDto = {
    org_id: 1,
    locations: [
        {name: 'Локация 1', address: 'ул. Ленина 1', phone: '79991234567', active_places: 10},
        {name: 'Локация 2', address: 'ул. Пушкина 2', phone: '79997654321', active_places: 5}
    ]
};
