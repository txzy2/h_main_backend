import {ConflictException, Inject, Injectable} from '@nestjs/common';
import {CreateOrgDto} from './dto/create-org.dto';
import {UpdateOrgDto} from './dto/update-org.dto';
import {ORGS_REPOSITORY, type OrgsRepositoryInterface} from './orgs.repository';
import {AuthUser} from '@/types';
import {Organization, Prisma} from '@prisma/client';
import {LicensesService} from '@/licenses/licenses.service';
import {PLANS_REPOSITORY, type PlansRepositoryInterface} from '@/plans/plans.repository';
import {UserService} from '@/user/user.service';
import {AppLoggerService} from '@/common/logger/logger.service';
import {PrismaService} from '@/prisma/prisma.service';

@Injectable()
export class OrgsService {
    public constructor(
        @Inject(ORGS_REPOSITORY) private readonly orgsRepository: OrgsRepositoryInterface,
        @Inject(PLANS_REPOSITORY) private readonly plansRepository: PlansRepositoryInterface,
        private readonly userService: UserService,
        private readonly licensesService: LicensesService,
        private readonly logger: AppLoggerService,
        private readonly prisma: PrismaService
    ) {
        this.logger.setContext(OrgsService.name);
    }

    /**
     * create - Создание организации
     *
     * @param {CreateOrgDto} orgData
     * @param {AuthUser} user
     *
     * @returns {Promise<Organization>}
     */
    public async create(orgData: CreateOrgDto, user: AuthUser): Promise<Organization> {
        await this.checkExistOrg({
            name: orgData.name,
            inn: orgData.inn
        });

        const plan = await this.plansRepository.findByName(orgData.plan);
        if (!plan) {
            this.logger.error(
                `Тарифный план ${orgData.plan} не найден. DATA: ${JSON.stringify(orgData)}`
            );
            throw new ConflictException('Выбранный тарифный план не найден');
        }

        const newOrg = await this.prisma.runTransaction(async tx => {
            const org = await this.orgsRepository.create(orgData, tx);
            await this.licensesService.registrateLicense(org.id, plan.id, tx);
            await this.userService.createUser(
                {
                    name: user.name,
                    login: user.login,
                    extId: user.sub,
                    orgId: org.id,
                    phoneNumber: orgData.phone_number
                },
                tx
            );
            return org;
        });
        this.logger.log(`Организация ${newOrg.name} зарегистрирована`);

        return newOrg;
    }

    /**
     * checkExistOrg - Проверка существования организации по переданным параметрам
     *
     * @param {Prisma.OrganizationWhereInput} params
     *
     * @returns {Promise<void>}
     *
     * @throws {ConflictException}
     */
    private async checkExistOrg(params: Prisma.OrganizationWhereInput): Promise<void> {
        const org = await this.orgsRepository.checkExistByParams({
            OR: Object.entries(params).map(([key, value]) => ({[key]: value}))
        });

        if (org) {
            throw new ConflictException({
                message: 'Организация уже зарегистрирована',
                data: {
                    name: org.name,
                    inn: org.inn,
                    kpp: org.kpp,
                    director: org.director
                }
            });
        }
    }

    findAll() {
        return `This action returns all orgs`;
    }

    findOne(id: number) {
        return `This action returns a #${id} org`;
    }

    update(id: number, updateOrgDto: UpdateOrgDto) {
        return `This action updates a #${id} org`;
    }

    remove(id: number) {
        return `This action removes a #${id} org`;
    }
}
