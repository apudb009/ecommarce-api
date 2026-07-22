import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';

// all default settings with types
const DEFAULT_SETTINGS = [
  { key: 'store_name', value: 'ShopApp', type: 'string' },
  { key: 'store_email', value: 'support@shopapp.com', type: 'string' },
  { key: 'store_phone', value: '', type: 'string' },
  { key: 'store_address', value: '', type: 'string' },
  { key: 'store_logo', value: '', type: 'string' },
  { key: 'store_favicon', value: '', type: 'string' },
  { key: 'currency', value: 'USD', type: 'string' },
  { key: 'currency_symbol', value: '$', type: 'string' },
  { key: 'maintenance_mode', value: 'false', type: 'boolean' },
  { key: 'allow_reviews', value: 'true', type: 'boolean' },
  { key: 'allow_guest_checkout', value: 'false', type: 'boolean' },
  { key: 'free_shipping_threshold', value: '50', type: 'number' },
  { key: 'max_cart_items', value: '20', type: 'number' },
  { key: 'low_stock_threshold', value: '5', type: 'number' },
  { key: 'order_cancel_hours', value: '24', type: 'number' },
  { key: 'auto_deliver_days', value: '7', type: 'number' },
  { key: 'loyalty_points_per_dollar', value: '1', type: 'number' },
  { key: 'loyalty_redeem_rate', value: '100', type: 'number' }, // 100 points = $1
  { key: 'social_facebook', value: '', type: 'string' },
  { key: 'social_instagram', value: '', type: 'string' },
  { key: 'social_twitter', value: '', type: 'string' },
  { key: 'meta_title', value: 'ShopApp - Online Store', type: 'string' },
  { key: 'meta_description', value: 'Shop the best products', type: 'string' },
];

@Injectable()
export class StoreSettingsService {
  constructor(private prisma: PrismaService) {}

  // ── SEED DEFAULT SETTINGS ──────────────────────────
  async seedDefaultSettings() {
    for (const setting of DEFAULT_SETTINGS) {
      await this.prisma.storeSetting.upsert({
        where: { key: setting.key },
        update: {},
        create: { key: setting.key, value: setting.value, type: setting.type },
      });
    }
  }

  // ── GET ALL ────────────────────────────────────────
  async findAll() {
    await this.seedDefaultSettings();

    const settings = await this.prisma.storeSetting.findMany({
      orderBy: { key: 'asc' },
    });

    // convert to key-value object
    return settings.reduce(
      (acc, setting) => ({ ...acc, [setting.key]: this.parseValue(setting) }),
      {} as Record<string, string | number | boolean | object>,
    );
  }

  // ── GET ONE ────────────────────────────────────────
  async findOne(key: string) {
    const setting = await this.prisma.storeSetting.findUnique({
      where: { key },
    });
    return setting ? this.parseValue(setting) : null;
  }

  // ── UPDATE ONE ─────────────────────────────────────
  async update(key: string, value: string) {
    return await this.prisma.storeSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value, type: 'string' },
    });
  }

  // ── UPDATE MANY ────────────────────────────────────
  async updateMany(settings: Record<string, string>) {
    const updates = Object.entries(settings).map(([key, value]) =>
      this.prisma.storeSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value, type: this.getType(value) },
      }),
    );

    await Promise.all(updates);
    return this.findAll();
  }

  // ── HELPER — parse value by type ──────────────────
  private parseValue(setting: { key: string; value: string; type: string }) {
    switch (setting.type) {
      case 'boolean':
        return setting.value === 'true';
      case 'number':
        return Number(setting.value);
      case 'json':
        return JSON.parse(setting.value) as object;
      default:
        return setting.value;
    }
  }

  private getType(value: string) {
    if (value === 'true' || value === 'false') return 'boolean';
    if (!isNaN(Number(value))) return 'number';
    if (value.startsWith('{') && value.endsWith('}')) return 'json';
    return 'string';
  }
}
