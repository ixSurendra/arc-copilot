import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MfaType } from '../../enums/mfa-type.enum';

export class MfaSetupDto {
  @ApiProperty({ description: 'MFA type', enum: MfaType })
  @IsEnum(MfaType)
  mfaType!: MfaType;

  @ApiPropertyOptional({ description: 'Phone number (for SMS OTP)' })
  @IsString()
  @IsOptional()
  phoneNumber?: string;
}

export class MfaVerifyDto {
  @ApiProperty({ description: 'OTP or TOTP code' })
  @IsString()
  code!: string;
}
