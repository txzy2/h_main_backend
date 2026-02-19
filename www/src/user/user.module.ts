import {Module} from '@nestjs/common';
import {UserService} from './user.service';
import {UserController} from './user.controller';
import {USERS_REPOSITORY, UsersRepository} from './user.repository';
import {PrismaService} from '@/prisma/prisma.service';

@Module({
    controllers: [UserController],
    providers: [
        UserService,
        PrismaService,
        {
            provide: USERS_REPOSITORY,
            useClass: UsersRepository
        }
    ],
    exports: [UserService]
})
export class UserModule {}
