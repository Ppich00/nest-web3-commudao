import { Controller, Get } from '@nestjs/common';
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

  @Get('buyResource')
  buyResource() {
    return this.etherjsService.buyResource();
  }

  @Get('sign')
  sign(){
    return this.etherjsService.sign();
  }

  @Get('refuelGas')
  refuelGas(){
    return this.etherjsService.refuelGas();
  }
}
