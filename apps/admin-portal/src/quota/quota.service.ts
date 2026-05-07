import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { sendWithTimeout } from '@org/shared';

@Injectable()
export class AdminQuotaService {
  constructor(
    @Inject('LICENSE_SERVICE') private readonly licenseService: ClientProxy,
  ) {}

  async checkQuota(query: Record<string, unknown>) {
    return sendWithTimeout(this.licenseService, { cmd: 'check_quota' }, query);
  }

  async purchaseTopUp(dto: Record<string, unknown>) {
    return sendWithTimeout(this.licenseService, { cmd: 'purchase_topup' }, dto);
  }
}
