import { Test, TestingModule } from '@nestjs/testing';
import { StoreSettingsService } from './store-settings.service';

describe('StoreSettingsService', () => {
  let service: StoreSettingsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StoreSettingsService],
    }).compile();

    service = module.get<StoreSettingsService>(StoreSettingsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
