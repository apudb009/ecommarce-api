import { Controller, Get, UseGuards } from '@nestjs/common';
import { Roles } from 'src/auth/constants';
import { RolesGuard } from 'src/auth/roles.guard';
import { AnalyticsService } from './analytics.service';

@UseGuards(RolesGuard)
@Roles('ADMIN')
@Controller('api/analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  getOverview() {
    return this.analyticsService.getOverview();
  }

  @Get('revenue-by-day')
  getRevenueByDay() {
    return this.analyticsService.getRevenueByDay();
  }

  @Get('orders-by-day')
  getOrdersByDay() {
    return this.analyticsService.getOrdersByDay();
  }

  @Get('orders-by-status')
  getOrdersByStatus() {
    return this.analyticsService.getOrdersByStatus();
  }

  @Get('top-products')
  getTopProducts() {
    return this.analyticsService.getTopProducts();
  }

  @Get('revenue-by-category')
  getRevenueByCategory() {
    return this.analyticsService.getRevenueByCategory();
  }

  @Get('new-users-by-week')
  getNewUsersByWeek() {
    return this.analyticsService.getNewUsersByWeek();
  }

  @Get('low-stock')
  getLowStock() {
    return this.analyticsService.getLowStockProducts();
  }

  @Get('recent-orders')
  getRecentOrders() {
    return this.analyticsService.getRecentOrders();
  }

  @Get('most-rated')
  getMostRated() {
    return this.analyticsService.getMostRatedProducts();
  }
}
