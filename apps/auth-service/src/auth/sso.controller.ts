import {
  Controller,
  Get,
  Query,
  Req,
  Res,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { Public } from '@arc/shared';
import type { Request, Response } from 'express';

/**
 * SSO Controller — handles Google & Microsoft OAuth2 redirect flows.
 * No extra packages needed (manual OAuth2 code exchange via fetch).
 *
 * Flow:
 *   1. User clicks SSO button → GET /auth/sso/google (or /microsoft)
 *   2. Redirects to provider's OAuth consent screen
 *   3. Provider redirects back to /auth/sso/google/callback?code=...
 *   4. We exchange code for tokens, extract email, look up user
 *   5. If found → redirect to frontend with tokens in URL hash
 *   6. If not found → redirect to frontend with error
 */
@ApiTags('SSO')
@Controller('auth/sso')
export class SsoController {
  private readonly logger = new Logger(SsoController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  private get frontendUrl(): string {
    return this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';
  }

  private get callbackBaseUrl(): string {
    return this.configService.get<string>('SSO_CALLBACK_BASE_URL') || 'http://localhost:4001';
  }

  // ─── Google OAuth ────────────────────────────────────

  @Public()
  @Get('google')
  @ApiOperation({ summary: 'Initiate Google SSO login' })
  googleRedirect(@Res() res: Response) {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    if (!clientId) {
      res.redirect(`${this.frontendUrl}/login?sso_error=${encodeURIComponent('Google SSO is not configured. Please contact your administrator.')}`);
      return;
    }

    const redirectUri = `${this.callbackBaseUrl}/auth/sso/google/callback`;
    const scope = 'openid email profile';
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=select_account`;

    res.redirect(url);
  }

  @Public()
  @Get('google/callback')
  @ApiOperation({ summary: 'Google SSO callback' })
  async googleCallback(
    @Query('code') code: string,
    @Query('error') error: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    if (error || !code) {
      res.redirect(`${this.frontendUrl}/login?sso_error=${encodeURIComponent(error || 'Google authentication was cancelled.')}`);
      return;
    }

    try {
      const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
      const clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');
      const redirectUri = `${this.callbackBaseUrl}/auth/sso/google/callback`;

      // Exchange code for tokens
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId ?? '',
          client_secret: clientSecret ?? '',
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      const tokenData = (await tokenRes.json()) as { id_token?: string; [k: string]: any };
      if (!tokenRes.ok || !tokenData.id_token) {
        this.logger.error('Google token exchange failed', tokenData);
        res.redirect(`${this.frontendUrl}/login?sso_error=${encodeURIComponent('Failed to authenticate with Google. Please try again.')}`);
        return;
      }

      // Decode ID token payload (token comes from Google's server directly, safe to decode)
      const email = this.decodeJwtPayload(tokenData.id_token)?.email;
      if (!email) {
        res.redirect(`${this.frontendUrl}/login?sso_error=${encodeURIComponent('Could not retrieve email from Google. Please try again.')}`);
        return;
      }

      // SSO login — look up user, issue tokens
      const loginResult = await this.authService.ssoLogin(
        email,
        'SSO_GOOGLE',
        req.ip,
        req.headers['user-agent'],
      );

      // Redirect to frontend with tokens in URL hash (not query params for security)
      res.redirect(
        `${this.frontendUrl}/login#access_token=${loginResult.accessToken}&refresh_token=${loginResult.refreshToken}`,
      );
    } catch (err: any) {
      const message = err?.message || 'Google authentication failed.';
      this.logger.error(`Google SSO error: ${message}`);
      res.redirect(`${this.frontendUrl}/login?sso_error=${encodeURIComponent(message)}`);
    }
  }

  // ─── Microsoft OAuth ─────────────────────────────────

  @Public()
  @Get('microsoft')
  @ApiOperation({ summary: 'Initiate Microsoft SSO login' })
  microsoftRedirect(@Res() res: Response) {
    const clientId = this.configService.get<string>('MICROSOFT_CLIENT_ID');
    if (!clientId) {
      res.redirect(`${this.frontendUrl}/login?sso_error=${encodeURIComponent('Microsoft SSO is not configured. Please contact your administrator.')}`);
      return;
    }

    const redirectUri = `${this.callbackBaseUrl}/auth/sso/microsoft/callback`;
    const scope = 'openid email profile';
    const url = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&response_mode=query&prompt=select_account`;

    res.redirect(url);
  }

  @Public()
  @Get('microsoft/callback')
  @ApiOperation({ summary: 'Microsoft SSO callback' })
  async microsoftCallback(
    @Query('code') code: string,
    @Query('error') error: string,
    @Query('error_description') errorDesc: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    if (error || !code) {
      res.redirect(`${this.frontendUrl}/login?sso_error=${encodeURIComponent(errorDesc || error || 'Microsoft authentication was cancelled.')}`);
      return;
    }

    try {
      const clientId = this.configService.get<string>('MICROSOFT_CLIENT_ID');
      const clientSecret = this.configService.get<string>('MICROSOFT_CLIENT_SECRET');
      const redirectUri = `${this.callbackBaseUrl}/auth/sso/microsoft/callback`;

      // Exchange code for tokens
      const tokenRes = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId ?? '',
          client_secret: clientSecret ?? '',
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
          scope: 'openid email profile',
        }),
      });

      const tokenData = (await tokenRes.json()) as { id_token?: string; [k: string]: any };
      if (!tokenRes.ok || !tokenData.id_token) {
        this.logger.error('Microsoft token exchange failed', tokenData);
        res.redirect(`${this.frontendUrl}/login?sso_error=${encodeURIComponent('Failed to authenticate with Microsoft. Please try again.')}`);
        return;
      }

      // Decode ID token payload
      const payload = this.decodeJwtPayload(tokenData.id_token);
      const email = payload?.email || payload?.preferred_username;
      if (!email) {
        res.redirect(`${this.frontendUrl}/login?sso_error=${encodeURIComponent('Could not retrieve email from Microsoft. Please try again.')}`);
        return;
      }

      // SSO login — look up user, issue tokens
      const loginResult = await this.authService.ssoLogin(
        email,
        'SSO_MICROSOFT',
        req.ip,
        req.headers['user-agent'],
      );

      res.redirect(
        `${this.frontendUrl}/login#access_token=${loginResult.accessToken}&refresh_token=${loginResult.refreshToken}`,
      );
    } catch (err: any) {
      const message = err?.message || 'Microsoft authentication failed.';
      this.logger.error(`Microsoft SSO error: ${message}`);
      res.redirect(`${this.frontendUrl}/login?sso_error=${encodeURIComponent(message)}`);
    }
  }

  // ─── Helpers ─────────────────────────────────────────

  private decodeJwtPayload(token: string): Record<string, any> | null {
    try {
      const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(Buffer.from(base64, 'base64').toString());
    } catch {
      return null;
    }
  }
}
