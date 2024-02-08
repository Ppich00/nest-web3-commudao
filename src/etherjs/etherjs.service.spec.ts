import { Test, TestingModule } from '@nestjs/testing';
import { EtherjsService } from './etherjs.service';

describe('EtherjsService', () => {
  let service: EtherjsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EtherjsService],
    }).compile();

    service = module.get<EtherjsService>(EtherjsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
