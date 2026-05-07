import { Module } from '@nestjs/common';
import { PlanHistoryController } from './plan-history.controller';
import { PlanHistoryService } from './plan-history.service';
import { PlanHistoryRepository } from './plan-history.repository';

@Module({
  controllers: [PlanHistoryController],
  providers: [PlanHistoryService, PlanHistoryRepository],
  exports: [PlanHistoryService],
})
export class PlanHistoryModule {}
