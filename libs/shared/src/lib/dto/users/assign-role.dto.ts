import { IsBoolean, IsOptional, IsArray, IsInt } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AssignRolePermissionsDto {
  @ApiProperty({ description: 'Module ID', example: 1 })
  @IsInt()
  moduleId!: number;

  @ApiProperty({ description: 'Permission ID', example: 1 })
  @IsInt()
  permissionId!: number;

  @ApiPropertyOptional({ description: 'Whether this permission is enabled', default: true })
  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean = true;
}

export class AssignUserRolesDto {
  @ApiProperty({ description: 'Role IDs to assign', type: [Number] })
  @IsArray()
  @IsInt({ each: true })
  roleIds!: number[];
}

export class AssignUserGroupsDto {
  @ApiProperty({ description: 'Group IDs to assign', type: [Number] })
  @IsArray()
  @IsInt({ each: true })
  groupIds!: number[];
}

export class AssignGroupRolesDto {
  @ApiProperty({ description: 'Role IDs to assign', type: [Number] })
  @IsArray()
  @IsInt({ each: true })
  roleIds!: number[];
}

export class AssignRoleUsersDto {
  @ApiProperty({ description: 'User IDs to assign to this role', type: [Number] })
  @IsArray()
  @IsInt({ each: true })
  userIds!: number[];
}

export class AssignGroupUsersDto {
  @ApiProperty({ description: 'User IDs to assign to this group', type: [Number] })
  @IsArray()
  @IsInt({ each: true })
  userIds!: number[];
}
