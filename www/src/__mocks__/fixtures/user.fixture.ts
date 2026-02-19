import {AuthUser} from '@/types';
import {Activity, User} from '@prisma/client';
import e from 'express';

export const mockAuthUser: AuthUser = {
    sub: 'ext-id-123',
    name: 'Anton',
    login: 'txzy23',
    email: 'test@test.com',
    role: 'SuperUser',
    active: Activity.Active,
    sid: 'sid-123'
};

export const mockCreateUser: User = {
    id: 1,
    extId: 'ext-id-123',
    name: 'Anton',
    login: 'txzy23',
    phoneNumber: '89177001742',
    orgId: 1,
    createdAt: new Date(),
    updatedAt: new Date()
};
