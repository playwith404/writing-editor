import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BillingService } from './billing.service';
import { SubscribeDto } from './dto/subscribe.dto';
import { AdminActivateSubscriptionDto } from './dto/admin-activate-subscription.dto';
import { AdminCancelSubscriptionDto } from './dto/admin-cancel-subscription.dto';

@UseGuards(JwtAuthGuard)
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('plans')
  plans() {
    return this.billingService.getPlans();
  }

  @Get('subscription')
  subscription(@Req() req: any) {
    return this.billingService.getSubscriptionForUser(req.user?.userId);
  }

  @Post('subscribe')
  subscribe(@Req() req: any, @Body() dto: SubscribeDto) {
    return this.billingService.requestSubscription(req.user?.userId, dto.plan);
  }

  @Post('admin/activate')
  adminActivate(@Req() req: any, @Body() dto: AdminActivateSubscriptionDto) {
    return this.billingService.adminActivateSubscription(req.user, dto.userId, dto.plan, dto.months ?? 1);
  }

  @Post('admin/cancel')
  adminCancel(@Req() req: any, @Body() dto: AdminCancelSubscriptionDto) {
    return this.billingService.adminCancelSubscription(req.user, dto.userId);
  }
}

