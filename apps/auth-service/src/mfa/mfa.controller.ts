import {
  Controller,
  Post,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { MfaService } from './mfa.service';
import { MfaSetupDto, MfaVerifyDto } from '@arc/shared';

@ApiTags('MFA')
@Controller('mfa')
export class MfaController {
  constructor(private readonly mfaService: MfaService) {}

  @Post(':userId/setup')
  @ApiOperation({ summary: 'Setup MFA', description: 'Initialize MFA for a user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 201, description: 'MFA setup initiated' })
  async setup(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: MfaSetupDto & { tenantId: number },
  ) {
    return this.mfaService.setup(userId, dto.tenantId, dto);
  }

  @Post(':userId/verify')
  @ApiOperation({ summary: 'Verify MFA', description: 'Verify MFA code to complete setup' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'MFA verified' })
  @HttpCode(HttpStatus.OK)
  async verify(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: MfaVerifyDto,
  ) {
    return this.mfaService.verify(userId, dto);
  }

  @Delete(':userId')
  @ApiOperation({ summary: 'Disable MFA' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'MFA disabled' })
  async disable(@Param('userId', ParseIntPipe) userId: number) {
    return this.mfaService.disable(userId);
  }
}
