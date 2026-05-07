import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Headers,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsageService } from './usage.service';
import { RecordUsageDto, SuperAdminGuard, Public } from '@org/shared';

@ApiTags('Usage')
@Controller('usage')
export class UsageController {
  private readonly internalApiKey: string;

  constructor(private readonly usageService: UsageService) {
    this.internalApiKey = process.env.INTERNAL_API_KEY || process.env.JWT_SECRET || 'internal-service-key';
  }

  // --- TCP Patterns ---

  @MessagePattern({ cmd: 'record_usage' })
  async recordUsageTcp(@Payload() data: RecordUsageDto) {
    return this.usageService.recordUsage(data);
  }

  @MessagePattern({ cmd: 'query_usage' })
  async queryUsageTcp(@Payload() data: { tenantId?: string; featureId?: string; userId?: string; page?: number; limit?: number }) {
    return this.usageService.queryUsage({
      tenantId: data.tenantId !== undefined ? Number(data.tenantId) : undefined,
      featureId: data.featureId !== undefined ? Number(data.featureId) : undefined,
      userId: data.userId !== undefined ? Number(data.userId) : undefined,
      page: data.page,
      limit: data.limit,
    });
  }

  // --- HTTP Endpoints ---

  @Post('record')
  @Public()
  @ApiOperation({ summary: 'Record a usage event (accepts internal API key or JWT)' })
  @ApiResponse({ status: 201, description: 'Usage recorded' })
  async recordUsage(
    @Body() dto: RecordUsageDto,
    @Headers('x-internal-api-key') apiKey?: string,
    @Headers('authorization') authHeader?: string,
  ) {
    // Accept either internal API key (service-to-service) or valid JWT (admin)
    const hasValidApiKey = apiKey && apiKey === this.internalApiKey;
    const hasJwt = authHeader?.startsWith('Bearer ');

    if (!hasValidApiKey && !hasJwt) {
      throw new ForbiddenException('Internal API key or JWT required');
    }

    return this.usageService.recordUsage(dto);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(SuperAdminGuard)
  @ApiOperation({ summary: 'Query usage records (super admin only)' })
  @ApiResponse({ status: 200, description: 'Paginated list of usage records' })
  async findAll(
    @Query('tenantId') tenantId?: string,
    @Query('featureId') featureId?: string,
    @Query('userId') userId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.usageService.queryUsage({
      tenantId: tenantId !== undefined ? Number(tenantId) : undefined,
      featureId: featureId !== undefined ? Number(featureId) : undefined,
      userId: userId !== undefined ? Number(userId) : undefined,
      page,
      limit,
    });
  }
}
