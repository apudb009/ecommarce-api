import { Module } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { AddressModule } from './address/address.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { CategoryModule } from './category/category.module';
import { ProductModule } from './product/product.module';
import { CartModule } from './cart/cart.module';
import { OrderModule } from './order/order.module';
import { PaymentModule } from './payment/payment.module';
import { ReviewModule } from './review/review.module';
import { MailModule } from './mail/mail.module';
import { CommonModule } from './common/common.module';
import { BannerModule } from './banner/banner.module';
import { InvoiceModule } from './invoice/invoice.module';
import { CouponModule } from './coupon/coupon.module';
import { WishlistModule } from './wishlist/wishlist.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { NewsletterModule } from './newsletter/newsletter.module';
import { NotificationModule } from './notification/notification.module';
import { UploadModule } from './upload/upload.module';
import { TaxModule } from './tax/tax.module';
import { ShippingModule } from './shipping/shipping.module';
import { ProductImageModule } from './product_image/product_image.module';
import { RetrunRequestModule } from './retrun_request/retrun_request.module';
import { ProductVariantImageModule } from './product_variant_image/product_variant_image.module';
import { ScheduleModule } from '@nestjs/schedule';
import { SchedulerModule } from './scheduler/scheduler.module';
import { StoreSettingsModule } from './store-settings/store-settings.module';
import { FlashSaleModule } from './flash-sale/flash-sale.module';
import { OrderTrackingModule } from './order-tracking/order-tracking.module';
import { RoleModule } from './role/role.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000, // 1 second
        limit: 10, // max 10 requests per second
      },
      {
        name: 'long',
        ttl: 60000, // 1 minute
        limit: 200, // max 200 requests per minute
      },
    ]),
    ScheduleModule.forRoot(),
    CommonModule,
    MailModule,
    AuthModule,
    UserModule,
    AddressModule,
    CategoryModule,
    ProductModule,
    CartModule,
    OrderModule,
    PaymentModule,
    ReviewModule,
    BannerModule,
    InvoiceModule,
    CouponModule,
    WishlistModule,
    AnalyticsModule,
    NewsletterModule,
    NotificationModule,
    UploadModule,
    TaxModule,
    ShippingModule,
    ProductImageModule,
    RetrunRequestModule,
    ProductVariantImageModule,
    SchedulerModule,
    StoreSettingsModule,
    FlashSaleModule,
    OrderTrackingModule,
    RoleModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: 'APP_GUARD',
      useClass: ThrottlerGuard,
    },
    AppService,
  ],
})
export class AppModule {}
