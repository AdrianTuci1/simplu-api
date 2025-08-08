import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional } from 'class-validator';

// Deprecated: per-business permissions are not used anymore. Use deactivatedModules in Create/Update DTOs.
export class BusinessPermissionsDto {}