import {
  Controller,
  Post,
  Patch,
  Body,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { CredentialsService } from './credentials.service';
import {
  RegisterCredentialsDto,
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  Public,
} from '@org/shared';

@ApiTags('Credentials')
@Controller('credentials')
export class CredentialsController {
  constructor(private readonly credentialsService: CredentialsService) {}

  // --- TCP Message Patterns ---

  @MessagePattern({ cmd: 'register_credentials' })
  async registerCredentialsTcp(@Payload() dto: RegisterCredentialsDto) {
    return this.credentialsService.register(dto);
  }

  // --- HTTP Endpoints ---

  @Post('register')
  @ApiOperation({ summary: 'Register credentials', description: 'Register authentication credentials for a user (password or SSO)' })
  @ApiResponse({ status: 201, description: 'Credentials registered' })
  @ApiResponse({ status: 409, description: 'Credentials already exist' })
  async register(@Body() dto: RegisterCredentialsDto) {
    return this.credentialsService.register(dto);
  }

  @Patch(':userId/change-password')
  @ApiOperation({ summary: 'Change password', description: 'Change the password for a user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Password changed' })
  @ApiResponse({ status: 401, description: 'Current password is incorrect' })
  async changePassword(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.credentialsService.changePassword(userId, dto);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Forgot password', description: 'Request a password reset email' })
  @ApiResponse({ status: 200, description: 'Reset email sent if email exists' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.credentialsService.forgotPassword(dto);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password', description: 'Reset password using a reset token' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.credentialsService.resetPassword(dto);
  }
}
