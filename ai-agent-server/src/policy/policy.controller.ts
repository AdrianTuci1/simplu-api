import { Controller, Get, Post, Delete, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { PolicyService, Policy } from './policy.service';
import { PolicyDto, CheckPolicyDto } from './dto/policy.dto';

@Controller('policies')
export class PolicyController {
  constructor(private readonly policyService: PolicyService) {}

  @Get(':tenantId')
  async getPolicies(@Param('tenantId') tenantId: string): Promise<Policy[]> {
    return this.policyService.getPolicies(tenantId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async addPolicy(@Body() policy: PolicyDto) {
    await this.policyService.addPolicy(policy);
    return { message: 'Policy added successfully' };
  }

  @Delete(':tenantId/:index')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removePolicy(
    @Param('tenantId') tenantId: string,
    @Param('index') index: string,
  ) {
    await this.policyService.removePolicy(tenantId, parseInt(index));
    return { message: 'Policy removed successfully' };
  }

  @Post(':tenantId/check')
  async checkPolicy(
    @Param('tenantId') tenantId: string,
    @Body() check: CheckPolicyDto,
  ) {
    const can = await this.policyService.can(tenantId, check.action, check.resource);
    return { can };
  }
} 