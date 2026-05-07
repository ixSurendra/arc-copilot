import {
  Controller,
  Post,
  Body,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto, RefreshTokenDto, LoginResponseDto, Public } from '@org/shared';
import type { Request } from 'express';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // --- TCP Message Patterns ---

  @MessagePattern({ cmd: 'validate_user' })
  async validateUserTcp(
    @Payload() data: { token: string },
  ) {
    const user = await this.authService.validateToken(data.token);
    return user ? { valid: true, user } : { valid: false };
  }

  @MessagePattern({ cmd: 'validate_token' })
  async validateTokenTcp(@Payload() data: { token: string }) {
    return this.authService.validateToken(data.token);
  }

  @MessagePattern({ cmd: 'get_auth_config' })
  async getAuthConfigTcp(@Payload() data: { tenantId: number }) {
    // Delegate to auth-config module in future; for now return basic info
    return { tenantId: data.tenantId };
  }

  // --- HTTP Endpoints ---

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Login', description: 'Authenticate with email/password and receive JWT tokens' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 403, description: 'Account locked or tenant inactive' })
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Req() req: Request): Promise<LoginResponseDto> {
    const ipAddress = req.ip;
    const deviceInfo = req.headers['user-agent'];
    return this.authService.login(dto, ipAddress, deviceInfo);
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh tokens', description: 'Exchange a refresh token for new access and refresh tokens' })
  @ApiResponse({ status: 200, description: 'Tokens refreshed' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshTokens(dto.refreshToken);
  }

  @Post('logout')
  @ApiOperation({ summary: 'Logout', description: 'Revoke all refresh tokens for the user' })
  @ApiResponse({ status: 204, description: 'Logged out' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body() body: { userId: number }): Promise<void> {
    await this.authService.logout(body.userId);
  }
}
