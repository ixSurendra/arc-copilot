import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AuditRepository } from './audit.repository';
import {
  AuditLog,
  AuditLogWithDetail,
  CreateAuditLogDto,
  QueryAuditLogDto,
  PaginatedResponse,
} from '@arc/shared';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly auditRepository: AuditRepository) {}

  async createAuditLog(dto: CreateAuditLogDto): Promise<AuditLogWithDetail> {
    this.logger.log(
      `Creating audit log: ${dto.action} on ${dto.resource} by ${dto.userId}`,
    );
    return this.auditRepository.create(dto);
  }

  async createManyAuditLogs(dtos: CreateAuditLogDto[]): Promise<number> {
    this.logger.log(`Batch creating ${dtos.length} audit logs`);
    return this.auditRepository.createMany(dtos);
  }

  async getAuditLogById(id: number): Promise<AuditLogWithDetail> {
    const log = await this.auditRepository.findById(id);
    if (!log) {
      throw new NotFoundException(`Audit log with id ${id} not found`);
    }
    return log;
  }

  async queryAuditLogs(
    query: QueryAuditLogDto,
  ): Promise<PaginatedResponse<AuditLog>> {
    return this.auditRepository.findWithFilters(query);
  }
}