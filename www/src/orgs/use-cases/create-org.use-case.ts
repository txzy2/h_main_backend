import {LicensesService} from '@/licenses/licenses.service';
import {UserService} from '@/user/user.service';
import {Inject, Injectable, ConflictException, InternalServerErrorException} from '@nestjs/common';
import {PrismaService} from '@/prisma/prisma.service';
import {CreateOrgDto} from '@/orgs/dto/create-org.dto';
import {AuthUser} from '@/types';
import {Organization, Prisma} from '@prisma/client';
import {AppLoggerService} from '@/common/logger/logger.service';
import {ApiErrors} from '@/common/errors/api-errors';
import {getErrorMessage} from '@/common/errors/get-error-message';
import {ORGS_REPOSITORY, type OrgsRepositoryInterface} from '../orgs.repository';
import {PlansService} from '@/plans/plans.service';
import {OrgsService} from '../orgs.service';

@Injectable()
export class CreateOrgUseCase {
    public constructor(
        @Inject(ORGS_REPOSITORY) private readonly orgsRepository: OrgsRepositoryInterface,
        private readonly licensesService: LicensesService,
        private readonly userService: UserService,
        private readonly orgService: OrgsService,
        private readonly plansService: PlansService,
        private readonly prisma: PrismaService,
        private readonly logger: AppLoggerService
    ) {
        this.logger.setContext(CreateOrgUseCase.name);
    }

    public async execute(dto: CreateOrgDto, user: AuthUser): Promise<Organization> {
        const plan = await this.plansService.getByName(dto.plan);

        try {
            return await this.prisma.$transaction(async tx => {
                const org = await this.orgsRepository.create(
                    dto,
                    this.orgService.generateOrgHashData({
                        name: dto.name,
                        inn: dto.inn,
                        kpp: dto.kpp
                    }),
                    tx
                );
                await this.licensesService.registrateLicense(org.id, plan.id, tx);
                await this.userService.createUser(
                    {
                        name: user.name,
                        login: user.login,
                        extId: user.sub,
                        orgId: org.id,
                        phoneNumber: dto.phone_number
                    },
                    tx
                );
                return org;
            });
        } catch (e: unknown) {
            if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
                throw new ConflictException(ApiErrors.ORG_IS_ALREADY_EXIST);
            }

            if (e instanceof ConflictException) {
                throw e;
            }

            this.logger.error('Org creation failed', getErrorMessage(e));
            throw new InternalServerErrorException(ApiErrors.INTERNAL_SERVER_ERROR);
        }
    }
}
