import { Injectable } from '@nestjs/common';
import { AUTH_SERVICE_HTTP_PORT } from '@arc/shared';

@Injectable()
export class BffAuthService {
  private readonly authBaseUrl: string;

  constructor() {
    const host = process.env['AUTH_SERVICE_HOST'] || 'localhost';
    this.authBaseUrl = `http://${host}:${AUTH_SERVICE_HTTP_PORT}`;
  }

  async login(
    body: { email: string; password: string; domain?: string },
    ip: string | undefined,
    userAgent: string | undefined,
  ) {
    const res = await fetch(`${this.authBaseUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(userAgent ? { 'User-Agent': userAgent } : {}),
        ...(ip ? { 'X-Forwarded-For': ip } : {}),
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok) {
      return { status: res.status, data };
    }
    return { status: 200, data };
  }

  async refresh(refreshToken: string) {
    const res = await fetch(`${this.authBaseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    const data = await res.json();
    if (!res.ok) {
      return { status: res.status, data };
    }
    return { status: 200, data };
  }

  async logout(userId: number) {
    const res = await fetch(`${this.authBaseUrl}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });

    return { status: res.status };
  }

  async forgotPassword(body: { email: string; domain?: string }) {
    const res = await fetch(`${this.authBaseUrl}/credentials/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return { status: res.status, data };
  }

  async resetPassword(body: { token: string; newPassword: string }) {
    const res = await fetch(`${this.authBaseUrl}/credentials/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return { status: res.status, data };
  }

  async changePassword(userId: number, body: { currentPassword: string; newPassword: string }) {
    const res = await fetch(`${this.authBaseUrl}/credentials/${userId}/change-password`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return { status: res.status, data };
  }
}
