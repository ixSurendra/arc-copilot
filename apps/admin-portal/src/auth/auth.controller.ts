import {
  Controller,
  Post,
  Patch,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '@arc/shared';
import { BffAuthService } from './auth.service';
import type { Request, Response } from 'express';

@ApiTags('Auth')
@Controller('auth')
export class BffAuthController {
  constructor(private readonly authService: BffAuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() body: { email: string; password: string; domain?: string },
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const result = await this.authService.login(
      body,
      req.ip,
      req.headers['user-agent'],
    );
    return res.status(result.status).json(result.data);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() body: { refreshToken: string },
    @Res() res: Response,
  ) {
    const result = await this.authService.refresh(body.refreshToken);
    return res.status(result.status).json(result.data);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body() body: { userId: number }, @Res() res: Response) {
    const result = await this.authService.logout(body.userId);
    return res.status(result.status).send();
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(
    @Body() body: { email: string; domain?: string },
    @Res() res: Response,
  ) {
    const result = await this.authService.forgotPassword(body);
    return res.status(result.status).json(result.data);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body() body: { token: string; newPassword: string },
    @Res() res: Response,
  ) {
    const result = await this.authService.resetPassword(body);
    return res.status(result.status).json(result.data);
  }

  @Patch('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Req() req: Request,
    @Body() body: { currentPassword: string; newPassword: string },
    @Res() res: Response,
  ) {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const result = await this.authService.changePassword(userId, body);
    return res.status(result.status).json(result.data);
  }
}
