import { Test, TestingModule } from '@nestjs/testing';
import { RetrunRequestService } from './retrun_request.service';

describe('RetrunRequestService', () => {
  let service: RetrunRequestService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RetrunRequestService],
    }).compile();

    service = module.get<RetrunRequestService>(RetrunRequestService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
