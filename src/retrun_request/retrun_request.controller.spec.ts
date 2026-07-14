import { Test, TestingModule } from '@nestjs/testing';
import { RetrunRequestController } from './retrun_request.controller';

describe('RetrunRequestController', () => {
  let controller: RetrunRequestController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RetrunRequestController],
    }).compile();

    controller = module.get<RetrunRequestController>(RetrunRequestController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
