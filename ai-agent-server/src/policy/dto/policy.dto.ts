import { IsString, IsArray, IsOptional, IsObject, IsEnum } from 'class-validator';
import { Action, Resource } from '../policy.service';

export class PolicyDto {
  @IsString()
  tenantId: string;

  @IsArray()
  @IsEnum(Action, { each: true })
  actions: Action[];

  @IsArray()
  @IsEnum(Resource, { each: true })
  resources: Resource[];

  @IsOptional()
  @IsObject()
  conditions?: Record<string, any>;
}

export class CheckPolicyDto {
  @IsEnum(Action)
  action: Action;

  @IsEnum(Resource)
  resource: Resource;
} 