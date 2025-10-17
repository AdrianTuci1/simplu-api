import { Body, Controller, HttpException, Logger, Post } from '@nestjs/common';
import { ElevenLabsService } from './elevenlabs.service';
import { ToolsService } from '@/modules/tools/tools.service';

@Controller('api/elevenlabs/tools')
export class ElevenLabsDirectToolsController {
  private readonly logger = new Logger(ElevenLabsDirectToolsController.name);

  constructor(
    private readonly elevenLabsService: ElevenLabsService,
    private readonly toolsService: ToolsService,
  ) {}

  /**
   * POST /api/elevenlabs/tools/execute
   * Generic endpoint to execute a registered tool directly (without Bedrock).
   * The Eleven Labs tool should POST a payload containing toolName, parameters, and metadata.
   */
  @Post('execute')
  async executeTool(@Body() body: any) {
    const { toolName, parameters, conversationId, metadata } = body || {};

    if (!toolName || typeof toolName !== 'string') {
      throw new HttpException('toolName is required', 400);
    }

    const businessId = metadata?.businessId;
    const locationId = metadata?.locationId;
    if (!businessId || !locationId) {
      throw new HttpException('metadata.businessId and metadata.locationId are required', 400);
    }

    const enabled = await this.elevenLabsService.isEnabled(businessId, locationId);
    if (!enabled) {
      throw new HttpException('Eleven Labs is not enabled for this tenant', 403);
    }

    const context = {
      tenant: { businessId, locationId },
      session: { conversationId },
      view: {},
    } as any;

    try {
      this.logger.log(`🎯 Executing tool: ${toolName} for ${businessId}-${locationId}`);
      const result = await this.toolsService.executeTool(toolName, parameters || {}, context);
      return { success: true, result };
    } catch (error: any) {
      this.logger.error(`❌ Tool execution failed: ${toolName}`, error?.message || error);
      throw new HttpException(error?.message || 'Tool execution failed', 500);
    }
  }
}


