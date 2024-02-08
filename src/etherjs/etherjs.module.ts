import { Module } from '@nestjs/common';
import { EtherjsService } from './etherjs.service';
import { EtherjsController } from './etherjs.controller';

@Module({
  controllers: [EtherjsController],
  providers: [EtherjsService],
})
export class EtherjsModule {}
