import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { AuthConfigService } from './auth-config.service';
import { CreateAuthConfigDto, CreateSsoProviderDto } from '@org/shared';

@ApiTags('Auth Config')
@Controller('auth-config')
export class AuthConfigController {
  constructor(private readonly authConfigService: AuthConfigService) {}

  // --- Tenant Auth Config ---

  @Get(':tenantId')
  @ApiOperation({ summary: 'Get tenant auth config' })
  @ApiParam({ name: 'tenantId', description: 'Tenant ID' })
  @ApiResponse({ status: 200, description: 'Auth config' })
  @ApiResponse({ status: 404, description: 'Config not found' })
  async getConfig(@Param('tenantId', ParseIntPipe) tenantId: number) {
    return this.authConfigService.getAuthConfig(tenantId);
  }

  @Post()
  @ApiOperation({ summary: 'Create tenant auth config' })
  @ApiResponse({ status: 201, description: 'Config created' })
  @ApiResponse({ status: 409, description: 'Config already exists' })
  async createConfig(@Body() dto: CreateAuthConfigDto) {
    return this.authConfigService.createAuthConfig(dto);
  }

  @Patch(':tenantId')
  @ApiOperation({ summary: 'Update tenant auth config' })
  @ApiParam({ name: 'tenantId', description: 'Tenant ID' })
  @ApiResponse({ status: 200, description: 'Config updated' })
  async updateConfig(
    @Param('tenantId', ParseIntPipe) tenantId: number,
    @Body() dto: Partial<CreateAuthConfigDto>,
  ) {
    return this.authConfigService.updateAuthConfig(tenantId, dto);
  }

  // --- SSO Providers ---

  @Get(':tenantId/sso-providers')
  @ApiOperation({ summary: 'List SSO providers for a tenant' })
  @ApiParam({ name: 'tenantId', description: 'Tenant ID' })
  @ApiResponse({ status: 200, description: 'List of SSO providers' })
  async getSsoProviders(@Param('tenantId', ParseIntPipe) tenantId: number) {
    return this.authConfigService.getSsoProviders(tenantId);
  }

  @Post('sso-providers')
  @ApiOperation({ summary: 'Create SSO provider config' })
  @ApiResponse({ status: 201, description: 'SSO provider created' })
  async createSsoProvider(@Body() dto: CreateSsoProviderDto) {
    return this.authConfigService.createSsoProvider(dto);
  }

  @Patch('sso-providers/:id')
  @ApiOperation({ summary: 'Update SSO provider config' })
  @ApiParam({ name: 'id', description: 'SSO provider ID' })
  @ApiResponse({ status: 200, description: 'SSO provider updated' })
  async updateSsoProvider(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<CreateSsoProviderDto>,
  ) {
    return this.authConfigService.updateSsoProvider(id, dto);
  }
}
