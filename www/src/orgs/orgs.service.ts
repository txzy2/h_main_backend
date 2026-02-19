import {Inject, Injectable} from '@nestjs/common';
import {CreateOrgDto} from './dto/create-org.dto';
import {UpdateOrgDto} from './dto/update-org.dto';
import {ORGS_REPOSITORY, OrgsRepositoryInterface} from './orgs.repository';

@Injectable()
export class OrgsService {
    public constructor(
        @Inject(ORGS_REPOSITORY) private readonly orgsRepository: OrgsRepositoryInterface
    ) {}

    public async create(createOrgDto: CreateOrgDto): Promise<string> {
        return 'This action adds a new org';
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
