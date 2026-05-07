import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { sendWithTimeout } from '@org/shared';

@Injectable()
export class AdminAuditService {
  constructor(
    @Inject('AUDIT_SERVICE') private readonly auditService: ClientProxy,
  ) {}

  async queryAuditLogs(query: Record<string, unknown>) {
    return sendWithTimeout(this.auditService, { cmd: 'get_audit_logs' }, query);
  }

  async getAuditLogById(id: number) {
    return sendWithTimeout(this.auditService, { cmd: 'get_audit_log_by_id' }, { id });
  }
}
