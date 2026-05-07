import { Module } from '@nestjs/common';
import { BillingsController } from './billings.controller';
import { BillingsService } from './billings.service';
import { BillingsRepository } from './billings.repository';

@Module({
  controllers: [BillingsController],
  providers: [BillingsService, BillingsRepository],
  exports: [BillingsService],
})
export class BillingsModule {}
