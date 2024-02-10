import { Controller, Get, Param, Query } from '@nestjs/common';
import { EtherjsService } from './etherjs.service';

@Controller('etherjs')
export class EtherjsController {
  constructor(private readonly etherjsService: EtherjsService) {}

  @Get()
  getTestEtherJS() {
    return this.etherjsService.getBalance();
  }

  @Get('call')
  getContact() {
    return this.etherjsService.readContact();
  }

  @Get('estimateResource')
  estimateResource(@Param('resource') resource) {
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
