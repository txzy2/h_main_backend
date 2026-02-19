import {Module} from '@nestjs/common';
import {LicensesService} from './licenses.service';
import {LICENSES_REPOSITORY, LicensesRepository} from './licenses.repository';
import {PrismaModule} from '@/prisma/prisma.module';
import {PrismaService} from '@/prisma/prisma.service';

@Module({
    imports: [PrismaModule],
    providers: [
        LicensesService,
        PrismaService,
        {
            provide: LICENSES_REPOSITORY,
            useClass: LicensesRepository
        }
    ],
    exports: [LicensesService]
})
export class LicensesModule {}
