import { Controller, Get, Param, Query, ParseIntPipe } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { AuditService } from './audit.service';
import {
  CreateAuditLogDto,
  QueryAuditLogDto,
  AuditLog,
  AuditLogWithDetail,
  PaginatedResponse,
} from '@org/shared';

@ApiTags('Audit Logs')
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  // --- Microservice Patterns (not exposed via Swagger) ---

  @EventPattern('audit_log_created')
  async handleAuditLogCreated(
    @Payload() data: CreateAuditLogDto,
  ): Promise<void> {
    await this.auditService.createAuditLog(data);
  }

  @MessagePattern({ cmd: 'get_audit_logs' })
  async getAuditLogs(
    @Payload() query: QueryAuditLogDto,
  ): Promise<PaginatedResponse<AuditLog>> {
    return this.auditService.queryAuditLogs(query);
  }

  @MessagePattern({ cmd: 'get_audit_log_by_id' })
  async getAuditLogById(@Payload() data: { id: number }): Promise<AuditLogWithDetail> {
    return this.auditService.getAuditLogById(data.id);
  }

  // --- HTTP Endpoints ---

  @Get()
  @ApiOperation({ summary: 'Query audit logs', description: 'Returns a paginated list of audit logs with optional filters' })
  @ApiResponse({ status: 200, description: 'Paginated list of audit logs' })
  async findAll(
    @Query() query: QueryAuditLogDto,
  ): Promise<PaginatedResponse<AuditLog>> {
    return this.auditService.queryAuditLogs(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get audit log by ID', description: 'Returns a single audit log entry by its ID' })
  @ApiParam({ name: 'id', description: 'Audit log ID', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @ApiResponse({ status: 200, description: 'The audit log entry' })
  @ApiResponse({ status: 404, description: 'Audit log not found' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<AuditLogWithDetail> {
    return this.auditService.getAuditLogById(id);
  }
}
