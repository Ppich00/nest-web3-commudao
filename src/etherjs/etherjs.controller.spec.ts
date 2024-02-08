import { Test, TestingModule } from '@nestjs/testing';
import { EtherjsController } from './etherjs.controller';
import { EtherjsService } from './etherjs.service';

describe('EtherjsController', () => {
  let controller: EtherjsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EtherjsController],
      providers: [EtherjsService],
    }).compile();

    controller = module.get<EtherjsController>(EtherjsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
