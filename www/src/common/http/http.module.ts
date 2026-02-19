import {Global, Module} from '@nestjs/common';
import {HttpModule} from '@nestjs/axios';
import {CommonHttpService} from './http.service';

@Global()
@Module({
    imports: [HttpModule],
    providers: [CommonHttpService],
    exports: [CommonHttpService]
})
export class CommonHttpModule {}
