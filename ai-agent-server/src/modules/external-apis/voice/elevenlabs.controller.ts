import { Controller, Post, Get, Delete, Body, Param, Query, UseGuards, Logger, BadRequestException } from '@nestjs/common';
import { ElevenLabsService } from './elevenlabs.service';
import { AgentService } from '../../agent/agent.service';
import { KinesisLoggerService } from '@/shared/services/kinesis-logger.service';

@Controller('api/elevenlabs')
export class ElevenLabsController {
  private readonly logger = new Logger(ElevenLabsController.name);

  constructor(
    private readonly elevenLabsService: ElevenLabsService,
    private readonly agentService: AgentService,
    private readonly kinesisLogger: KinesisLoggerService,
  ) {}

  /**
   * Activează Eleven Labs pentru un tenant (MANUAL, requires admin)
   * Creează agent pe Eleven Labs cu configurație automată
   * POST /api/elevenlabs/activate/:businessLocationId
   * 
   * Format: B0100001-L0100001 (businessId-locationId)
   */
  @Post('activate/:businessLocationId')
  // @UseGuards(AdminGuard) // TODO: Add admin guard
  async activate(
    @Param('businessLocationId') businessLocationId: string,
    @Body()
    body: {
      voiceId?: string; // Optional - default per limbă
      greeting?: string; // Optional - generat automat
      customPrompt?: string;
    }
  ) {
    // Parse businessLocationId
    const [businessId, locationId] = businessLocationId.split('-');
    
    if (!businessId || !locationId) {
      throw new BadRequestException('Invalid format. Use: businessId-locationId (e.g., B0100001-L0100001)');
    }

    this.logger.log(`📞 Activating Eleven Labs for ${businessId}:${locationId}`);

    return this.elevenLabsService.registerAgent({
      businessId,
      locationId,
      agentId: '', // Va fi generat de createElevenLabsAgent
      ...body,
    });
  }

  /**
   * Update configuration
   * POST /api/elevenlabs/config/:businessLocationId
   */
  @Post('config/:businessLocationId')
  async updateConfig(
    @Param('businessLocationId') businessLocationId: string,
    @Body()
    body: {
      voiceId?: string;
      greeting?: string;
      customPrompt?: string;
      conversationSettings?: {
        maxDuration?: number;
        recordCalls?: boolean;
        sendTranscripts?: boolean;
      };
    }
  ) {
    const [businessId, locationId] = businessLocationId.split('-');
    
    if (!businessId || !locationId) {
      throw new BadRequestException('Invalid format. Use: businessId-locationId');
    }

    this.logger.log(`📞 Updating Eleven Labs config for ${businessId}:${locationId}`);

    return this.elevenLabsService.updateConfig(businessId, locationId, body);
  }

  /**
   * List all agents for a business
   * GET /api/elevenlabs/agents/:businessId
   */
  @Get('agents/:businessId')
  async listAgents(@Param('businessId') businessId: string) {
    const agents = await this.elevenLabsService.getAgentsByBusiness(businessId);

    return {
      success: true,
      count: agents.length,
      agents: agents.map(agent => ({
        businessLocationId: `${agent.businessId}-${agent.locationId}`,
        locationId: agent.locationId,
        enabled: agent.enabled,
        agentId: agent.agentId,
        voiceId: agent.voiceId,
        greeting: agent.greeting,
        conversationSettings: agent.conversationSettings,
        createdAt: agent.createdAt,
        updatedAt: agent.updatedAt,
      })),
    };
  }

  /**
   * Toggle Enable/Disable (Business Owner)
   * POST /api/elevenlabs/toggle/:businessLocationId
   */
  @Post('toggle/:businessLocationId')
  async toggleEnabled(
    @Param('businessLocationId') businessLocationId: string,
    @Body() body: { enabled: boolean }
  ) {
    const [businessId, locationId] = businessLocationId.split('-');
    
    if (!businessId || !locationId) {
      throw new BadRequestException('Invalid format. Use: businessId-locationId');
    }

    this.logger.log(`📞 Toggling Eleven Labs for ${businessId}:${locationId} to ${body.enabled}`);

    if (body.enabled) {
      // Check if config exists, if not, need to activate first
      const config = await this.elevenLabsService.getConfig(businessId, locationId);
      if (!config) {
        return {
          success: false,
          message: 'Agent not configured yet. Please activate first (admin only).',
        };
      }

      // Enable existing agent
      return this.elevenLabsService.reactivate(businessId, locationId);
    } else {
      // Disable agent
      return this.elevenLabsService.deactivate(businessId, locationId);
    }
  }

  /**
   * Dezactivare Eleven Labs (Admin only)
   * DELETE /api/elevenlabs/deactivate/:businessLocationId
   */
  @Delete('deactivate/:businessLocationId')
  // @UseGuards(AdminGuard)
  async deactivate(
    @Param('businessLocationId') businessLocationId: string
  ) {
    const [businessId, locationId] = businessLocationId.split('-');
    
    if (!businessId || !locationId) {
      throw new BadRequestException('Invalid format. Use: businessId-locationId');
    }

    this.logger.log(`📞 Deactivating Eleven Labs for ${businessId}:${locationId}`);

    return this.elevenLabsService.deactivate(businessId, locationId);
  }

  /**
   * Get configuration for Business Owner (public info)
   * GET /api/elevenlabs/my-config/:businessLocationId
   */
  @Get('my-config/:businessLocationId')
  async getMyConfig(
    @Param('businessLocationId') businessLocationId: string
  ) {
    const [businessId, locationId] = businessLocationId.split('-');
    
    if (!businessId || !locationId) {
      throw new BadRequestException('Invalid format. Use: businessId-locationId (e.g., B0100001-L0100001)');
    }

    const config = await this.elevenLabsService.getConfig(businessId, locationId);

    if (!config) {
      return {
        configured: false,
        enabled: false,
        message: 'Eleven Labs not configured for this location. Contact admin to activate.',
      };
    }

    return {
      configured: true,
      enabled: config.enabled,
      greeting: config.greeting,
      customPrompt: config.customPrompt,
      voiceId: config.voiceId,
      conversationSettings: config.conversationSettings,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };
  }

  /**
   * Update configuration (Business Owner can update greeting and prompt)
   * POST /api/elevenlabs/my-config/:businessLocationId
   */
  @Post('my-config/:businessLocationId')
  async updateMyConfig(
    @Param('businessLocationId') businessLocationId: string,
    @Body()
    body: {
      greeting?: string;
      customPrompt?: string;
      conversationSettings?: {
        maxDuration?: number;
        recordCalls?: boolean;
        sendTranscripts?: boolean;
      };
    }
  ) {
    const [businessId, locationId] = businessLocationId.split('-');
    
    if (!businessId || !locationId) {
      throw new BadRequestException('Invalid format. Use: businessId-locationId');
    }

    this.logger.log(`📞 User updating Eleven Labs config for ${businessId}:${locationId}`);

    // Check if config exists
    const config = await this.elevenLabsService.getConfig(businessId, locationId);
    if (!config) {
      return {
        success: false,
        message: 'Agent not configured yet. Contact admin to activate first.',
      };
    }

    return this.elevenLabsService.updateConfig(businessId, locationId, {
      greeting: body.greeting,
      customPrompt: body.customPrompt,
      conversationSettings: body.conversationSettings,
    });
  }

  /**
   * Check status (Admin/Debug)
   * GET /api/elevenlabs/status/:businessLocationId
   */
  @Get('status/:businessLocationId')
  async getStatus(
    @Param('businessLocationId') businessLocationId: string
  ) {
    const [businessId, locationId] = businessLocationId.split('-');
    
    if (!businessId || !locationId) {
      throw new BadRequestException('Invalid format. Use: businessId-locationId');
    }

    const enabled = await this.elevenLabsService.isEnabled(businessId, locationId);
    const config = await this.elevenLabsService.getConfig(businessId, locationId);

    return {
      businessLocationId,
      enabled,
      config: config ? {
        agentId: config.agentId,
        voiceId: config.voiceId,
        greeting: config.greeting,
        conversationSettings: config.conversationSettings,
      } : null,
    };
  }


  /**
   * Test endpoint pentru a verifica configurația
   * GET /api/elevenlabs/test/:businessLocationId
   */
  @Get('test/:businessLocationId')
  async testConfiguration(
    @Param('businessLocationId') businessLocationId: string
  ) {
    const [businessId, locationId] = businessLocationId.split('-');
    
    if (!businessId || !locationId) {
      throw new BadRequestException('Invalid format. Use: businessId-locationId');
    }

    try {
      const config = await this.elevenLabsService.getConfig(businessId, locationId);

      if (!config) {
        return {
          success: false,
          message: 'No Eleven Labs configuration found for this tenant',
        };
      }

      if (!config.enabled) {
        return {
          success: false,
          message: 'Eleven Labs is configured but not enabled',
        };
      }

      return {
        success: true,
        message: 'Eleven Labs is properly configured and enabled',
        businessLocationId,
        config: {
          agentId: config.agentId,
          voiceId: config.voiceId,
          enabled: config.enabled,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to test configuration',
        error: error.message,
      };
    }
  }
}
