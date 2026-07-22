import { Test, TestingModule } from '@nestjs/testing';
import { StoreSettingsController } from './store-settings.controller';

describe('StoreSettingsController', () => {
  let controller: StoreSettingsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StoreSettingsController],
    }).compile();

    controller = module.get<StoreSettingsController>(StoreSettingsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
