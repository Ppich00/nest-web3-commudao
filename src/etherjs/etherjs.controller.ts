import { Controller, Get, Param, OnApplicationBootstrap } from '@nestjs/common';
import { EtherjsService } from './etherjs.service';

@Controller('etherjs')
export class EtherjsController implements OnApplicationBootstrap {
  constructor(private readonly etherjsService: EtherjsService) {}

  onApplicationBootstrap() {
    this.etherjsService.readContact();
  }

  @Get()
  getTestEtherJS() {
    return this.etherjsService.getBalance();
  }

  @Get('call')
  getContact() {
    return this.etherjsService.readContact();
  }

  @Get('estimateResource/:resource')
  estimateResource(@Param('resource') resource: number = 500) {
    return this.etherjsService.estimateResource(resource);
  }

  @Get('sign')
  sign() {
    return this.etherjsService.sign();
  }

  @Get('refuelGas')
  refuelGas() {
    return this.etherjsService.refuelGas();
  }

  @Get('getResource')
  getResource() {
    return this.etherjsService.getResource();
  }
}
