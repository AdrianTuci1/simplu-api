import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { KinesisLoggerService } from '@/shared/services/kinesis-logger.service';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, DeleteCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDBClient, tableNames } from '@/config/dynamodb.config';
import { BusinessInfoService } from '@/modules/business-info/business-info.service';

export interface ElevenLabsAgentConfig {
  businessId: string; // PK
  locationId: string; // SK
  enabled: boolean;
  agentId: string; // Eleven Labs agent ID (creat pe contul global)
  voiceId: string;
  greeting: string;
  customPrompt?: string;
  phoneNumber?: string; // Optional dedicated number
  conversationSettings: {
    maxDuration: number;
    recordCalls: boolean;
    sendTranscripts: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class ElevenLabsService {
  private readonly logger = new Logger(ElevenLabsService.name);
  private readonly elevenLabsApiUrl = 'https://api.elevenlabs.io/v1';
  private readonly dynamoClient = DynamoDBDocumentClient.from(dynamoDBClient);
  private readonly apiKey: string; // Un singur API key global

  constructor(
    private readonly kinesisLogger: KinesisLoggerService,
    private readonly businessInfoService: BusinessInfoService,
    private readonly configService: ConfigService,
  ) {
    this.apiKey = this.configService.get<string>('elevenlabs.apiKey') || process.env.ELEVENLABS_API_KEY || '';
    if (!this.apiKey) {
      this.logger.warn('⚠️ ELEVENLABS_API_KEY not configured');
    } else {
      this.logger.log('✅ Eleven Labs API key configured');
    }
  }

  /**
   * Obține configurația Eleven Labs pentru un tenant din DynamoDB
   */
  async getConfig(businessId: string, locationId: string): Promise<ElevenLabsAgentConfig | null> {
    try {
      this.logger.log(`🔧 Getting Eleven Labs config for ${businessId}:${locationId}`);

      const result = await this.dynamoClient.send(new GetCommand({
        TableName: tableNames.elevenLabsAgents,
        Key: {
          businessId,
          locationId,
        },
      }));

      if (!result.Item) {
        this.logger.log(`No Eleven Labs config found for ${businessId}:${locationId}`);
        return null;
      }

      const config = result.Item as ElevenLabsAgentConfig;
      this.logger.log(`✅ Eleven Labs config loaded: enabled=${config.enabled}, agentId=${config.agentId}`);

      return config;
    } catch (error) {
      this.logger.error(`❌ Failed to get Eleven Labs config:`, error);
      return null;
    }
  }

  /**
   * Obține toți agenții pentru un business (toate locațiile)
   */
  async getAgentsByBusiness(businessId: string): Promise<ElevenLabsAgentConfig[]> {
    try {
      const result = await this.dynamoClient.send(new QueryCommand({
        TableName: tableNames.elevenLabsAgents,
        KeyConditionExpression: 'businessId = :businessId',
        ExpressionAttributeValues: {
          ':businessId': businessId,
        },
      }));

      return (result.Items as ElevenLabsAgentConfig[]) || [];
    } catch (error) {
      this.logger.error(`❌ Failed to get agents for business ${businessId}:`, error);
      return [];
    }
  }

  /**
   * Găsește tenant (businessId + locationId) pe baza agentId de la Eleven Labs
   * 
   * NOTĂ: Această metodă face un scan prin DynamoDB. Pentru producție, ar trebui:
   * 1. Să adăugăm un GSI (Global Secondary Index) pe agentId
   * 2. Sau să păstrăm un cache în memorie cu mapping-ul agentId -> businessId:locationId
   * 3. Sau Eleven Labs să trimită businessId/locationId în metadata webhook-ului
   */
  async findTenantByAgentId(agentId: string): Promise<{ businessId: string; locationId: string } | null> {
    try {
      this.logger.log(`🔍 Looking up tenant for agentId: ${agentId}`);

      // Scan prin DynamoDB (nu e ideal, dar funcționează pentru număr limitat de agenți)
      // TODO: Adaugă GSI pe agentId pentru lookup mai rapid
      const result = await this.dynamoClient.send(new ScanCommand({
        TableName: tableNames.elevenLabsAgents,
        FilterExpression: 'agentId = :agentId',
        ExpressionAttributeValues: {
          ':agentId': agentId,
        },
      }));

      if (!result.Items || result.Items.length === 0) {
        this.logger.warn(`⚠️ No tenant found for agentId: ${agentId}`);
        return null;
      }

      const config = result.Items[0] as ElevenLabsAgentConfig;
      this.logger.log(`✅ Found tenant: ${config.businessId}:${config.locationId} for agentId: ${agentId}`);

      return {
        businessId: config.businessId,
        locationId: config.locationId,
      };
    } catch (error) {
      this.logger.error(`❌ Failed to find tenant by agentId:`, error);
      return null;
    }
  }

  /**
   * Verifică dacă Eleven Labs este activat pentru un tenant
   */
  async isEnabled(businessId: string, locationId: string): Promise<boolean> {
    const config = await this.getConfig(businessId, locationId);
    return config?.enabled || false;
  }

  /**
   * Activează Eleven Labs pentru un tenant
   * Creează agent pe Eleven Labs și salvează în DynamoDB
   * 
   * NOTĂ: Această metodă este apelată MANUAL de către admin
   */
  async registerAgent(params: {
    businessId: string;
    locationId: string;
    agentId?: string; // Opțional dacă vrem să-l creăm noi
    voiceId?: string;
    greeting?: string;
    customPrompt?: string;
    toolIds?: string[]; // Eleven Labs tool IDs to attach to the agent prompt
  }): Promise<{ success: boolean; agentId?: string; message: string }> {
    try {
      this.logger.log(`🔧 Registering Eleven Labs agent for ${params.businessId}:${params.locationId}`);

      // 1. Verifică dacă deja există config
      const existingConfig = await this.getConfig(params.businessId, params.locationId);
      if (existingConfig?.enabled) {
        return {
          success: false,
          message: 'Eleven Labs is already registered for this tenant',
        };
      }

      // 2. Obține informații despre business din DynamoDB
      const businessInfo = await this.businessInfoService.getBusinessInfo(params.businessId);
      if (!businessInfo) {
        throw new BadRequestException(`Business info not found for ${params.businessId}`);
      }

      const locationInfo = businessInfo.locations.find(loc => loc.locationId === params.locationId);
      if (!locationInfo) {
        throw new BadRequestException(`Location ${params.locationId} not found for business ${params.businessId}`);
      }

      this.logger.log(`📋 Business info: ${businessInfo.businessName} (${businessInfo.businessType})`);
      this.logger.log(`📍 Location: ${locationInfo.name}`);

      // 3. Generează defaults dacă nu sunt specificate
      const greeting = params.greeting || this.generateDefaultGreeting(businessInfo, locationInfo);
      const voiceId = params.voiceId || this.getDefaultVoiceId(businessInfo.settings.language);

      // 4. Determină tool-urile implicite pentru businessType dacă nu sunt furnizate
      const defaultToolIds = this.getDefaultToolIdsForBusinessType(businessInfo.businessType);
      const toolIdsToAttach = (params.toolIds && params.toolIds.length > 0) ? params.toolIds : defaultToolIds;

      // 5. Creează agent pe Eleven Labs (dacă nu avem agentId deja)
      let agentId = params.agentId;
      if (!agentId) {
        this.logger.log(`🎙️ Creating new agent on Eleven Labs...`);
        agentId = await this.createElevenLabsAgent({
          businessId: params.businessId,
          locationId: params.locationId,
          businessName: businessInfo.businessName,
          businessType: businessInfo.businessType,
          locationName: locationInfo.name,
          voiceId,
          greeting,
          customPrompt: params.customPrompt,
          toolIds: toolIdsToAttach,
        });
      }

      // 5. Salvează configurația în DynamoDB
      const config: ElevenLabsAgentConfig = {
        businessId: params.businessId,
        locationId: params.locationId,
        enabled: true,
        agentId,
        voiceId,
        greeting,
        customPrompt: params.customPrompt,
        conversationSettings: {
          maxDuration: 300,
          recordCalls: true,
          sendTranscripts: false,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await this.dynamoClient.send(new PutCommand({
        TableName: tableNames.elevenLabsAgents,
        Item: config,
      }));

      this.logger.log(`✅ Eleven Labs activated: ${params.businessId}:${params.locationId} → ${agentId}`);
      this.logger.log(`📊 Config saved to DynamoDB (NOT logged to Kinesis - only conversations are logged)`);

      return {
        success: true,
        agentId,
        message: 'Eleven Labs conversational AI activated successfully',
      };
    } catch (error) {
      this.logger.error(`❌ Failed to register Eleven Labs agent:`, error);
      throw error;
    }
  }

  /**
   * Returnează lista de tool_ids implicite per businessType, citite din env.
   * Exemplu env vars:
   *  - ELEVENLABS_TOOL_IDS_DENTAL=tool_abc,tool_def
   *  - ELEVENLABS_TOOL_IDS_GYM=...
   *  - ELEVENLABS_TOOL_IDS_HOTEL=...
   */
  private getDefaultToolIdsForBusinessType(businessType: string): string[] {
    const map = this.configService.get<Record<string, string[]>>('elevenlabs.toolIds') || {};
    const key = String(businessType || '').toLowerCase();
    return Array.isArray(map[key]) ? map[key] : [];
  }

  /**
   * Dezactivează Eleven Labs pentru un tenant
   * Păstrează agent ID pentru reactivare
   */
  async deactivate(businessId: string, locationId: string): Promise<{ success: boolean; message: string }> {
    try {
      this.logger.log(`🔧 Deactivating Eleven Labs for ${businessId}:${locationId}`);

      const config = await this.getConfig(businessId, locationId);
      if (!config) {
        return {
          success: false,
          message: 'No Eleven Labs configuration found for this tenant',
        };
      }

      if (!config.enabled) {
        return {
          success: true,
          message: 'Eleven Labs is already deactivated',
        };
      }

      // Update enabled flag (păstrăm agentId pentru reactivare)
      await this.dynamoClient.send(new UpdateCommand({
        TableName: tableNames.elevenLabsAgents,
        Key: {
          businessId,
          locationId,
        },
        UpdateExpression: 'SET enabled = :enabled, updatedAt = :updatedAt',
        ExpressionAttributeValues: {
          ':enabled': false,
          ':updatedAt': new Date().toISOString(),
        },
      }));

      this.logger.log(`✅ Eleven Labs deactivated for ${businessId}:${locationId}`);

      return {
        success: true,
        message: 'Eleven Labs conversational AI deactivated successfully',
      };
    } catch (error) {
      this.logger.error(`❌ Failed to deactivate Eleven Labs:`, error);
      throw error;
    }
  }

  /**
   * Reactivează (re-enable) Eleven Labs pentru un tenant
   */
  async reactivate(businessId: string, locationId: string): Promise<{ success: boolean; message: string }> {
    try {
      this.logger.log(`🔧 Reactivating Eleven Labs for ${businessId}:${locationId}`);

      const config = await this.getConfig(businessId, locationId);
      if (!config) {
        return {
          success: false,
          message: 'No Eleven Labs configuration found. Please activate first (admin only).',
        };
      }

      if (config.enabled) {
        return {
          success: true,
          message: 'Eleven Labs is already active',
        };
      }

      // Update enabled flag to true
      await this.dynamoClient.send(new UpdateCommand({
        TableName: tableNames.elevenLabsAgents,
        Key: {
          businessId,
          locationId,
        },
        UpdateExpression: 'SET enabled = :enabled, updatedAt = :updatedAt',
        ExpressionAttributeValues: {
          ':enabled': true,
          ':updatedAt': new Date().toISOString(),
        },
      }));

      this.logger.log(`✅ Eleven Labs reactivated for ${businessId}:${locationId}`);

      return {
        success: true,
        message: 'Eleven Labs conversational AI reactivated successfully',
      };
    } catch (error) {
      this.logger.error(`❌ Failed to reactivate Eleven Labs:`, error);
      throw error;
    }
  }

  /**
   * Șterge complet configurația Eleven Labs pentru un tenant
   */
  async deleteConfig(businessId: string, locationId: string): Promise<{ success: boolean; message: string }> {
    try {
      this.logger.log(`🗑️ Deleting Eleven Labs config for ${businessId}:${locationId}`);

      await this.dynamoClient.send(new DeleteCommand({
        TableName: tableNames.elevenLabsAgents,
        Key: {
          businessId,
          locationId,
        },
      }));

      this.logger.log(`✅ Eleven Labs config deleted for ${businessId}:${locationId}`);

      return {
        success: true,
        message: 'Eleven Labs configuration deleted successfully',
      };
    } catch (error) {
      this.logger.error(`❌ Failed to delete Eleven Labs config:`, error);
      throw error;
    }
  }

  /**
   * Update configurație (voiceId, greeting, settings)
   */
  async updateConfig(
    businessId: string,
    locationId: string,
    updates: {
      voiceId?: string;
      greeting?: string;
      customPrompt?: string;
      conversationSettings?: Partial<ElevenLabsAgentConfig['conversationSettings']>;
    }
  ): Promise<{ success: boolean; message: string }> {
    try {
      this.logger.log(`🔧 Updating Eleven Labs config for ${businessId}:${locationId}`);

      const config = await this.getConfig(businessId, locationId);
      if (!config) {
        return {
          success: false,
          message: 'No configuration found for this tenant',
        };
      }

      // Build update expression
      const updateExpressions: string[] = [];
      const expressionAttributeValues: any = {
        ':updatedAt': new Date().toISOString(),
      };

      if (updates.voiceId) {
        updateExpressions.push('voiceId = :voiceId');
        expressionAttributeValues[':voiceId'] = updates.voiceId;
      }
      if (updates.greeting) {
        updateExpressions.push('greeting = :greeting');
        expressionAttributeValues[':greeting'] = updates.greeting;
      }
      if (updates.customPrompt !== undefined) {
        updateExpressions.push('customPrompt = :customPrompt');
        expressionAttributeValues[':customPrompt'] = updates.customPrompt;
      }
      if (updates.conversationSettings) {
        // Merge cu settings existente
        const updatedSettings = {
          ...config.conversationSettings,
          ...updates.conversationSettings,
        };
        updateExpressions.push('conversationSettings = :conversationSettings');
        expressionAttributeValues[':conversationSettings'] = updatedSettings;
      }

      updateExpressions.push('updatedAt = :updatedAt');

      await this.dynamoClient.send(new UpdateCommand({
        TableName: tableNames.elevenLabsAgents,
        Key: {
          businessId,
          locationId,
        },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeValues: expressionAttributeValues,
      }));

      this.logger.log(`✅ Eleven Labs config updated for ${businessId}:${locationId}`);

      return {
        success: true,
        message: 'Configuration updated successfully',
      };
    } catch (error) {
      this.logger.error(`❌ Failed to update Eleven Labs config:`, error);
      throw error;
    }
  }

  /**
   * Procesează o conversație primită de la Eleven Labs webhook
   * Aici se face integrarea agent-to-agent cu Bedrock
   */
  async processConversation(params: {
    conversationId: string;
    businessId: string;
    locationId: string;
    message: string;
    metadata?: any;
  }): Promise<{ response: string; continueConversation: boolean }> {
    try {
      this.logger.log(`🎙️ Processing Eleven Labs conversation: ${params.conversationId}`);

      // Verifică dacă Eleven Labs este activat
      const isEnabled = await this.isEnabled(params.businessId, params.locationId);
      if (!isEnabled) {
        this.logger.warn(`Eleven Labs not enabled for ${params.businessId}:${params.locationId}`);
        return {
          response: 'Ne pare rău, serviciul de asistență vocală nu este disponibil momentan.',
          continueConversation: false,
        };
      }

      // Log conversație la Kinesis
      await this.kinesisLogger.logAgentVoiceCall({
        businessId: params.businessId,
        locationId: params.locationId,
        agentSessionId: params.conversationId, // conversationId = sessionId pentru voice
        subAction: 'receive',
        conversationId: params.conversationId,
        transcriptAvailable: true,
      });

      // TODO: Aici se va face integrarea cu Bedrock Agent
      // Pentru moment returnăm un răspuns mock
      // În următorul pas vom integra cu agent.service.ts pentru procesare prin Bedrock

      this.logger.log(`✅ Conversation processed: ${params.conversationId}`);

      return {
        response: 'Am înregistrat mesajul tău. Echipa noastră te va contacta în curând.',
        continueConversation: true,
      };
    } catch (error) {
      this.logger.error(`❌ Failed to process conversation:`, error);

      // Log failure
      await this.kinesisLogger.logAgentVoiceCall({
        businessId: params.businessId,
        locationId: params.locationId,
        agentSessionId: params.conversationId,
        subAction: 'failed',
        conversationId: params.conversationId,
        errorMessage: error.message,
      });

      return {
        response: 'Ne pare rău, am întâmpinat o problemă tehnică. Te rugăm să încerci din nou.',
        continueConversation: false,
      };
    }
  }

  /**
   * Creează agent pe Eleven Labs prin API (folosește API key-ul global)
   * 
   * Eleven Labs API: POST /v1/convai/agents/create
   */
  private async createElevenLabsAgent(params: {
    businessId: string;
    locationId: string;
    businessName: string;
    businessType: 'dental' | 'gym' | 'hotel';
    locationName: string;
    voiceId: string;
    greeting: string;
    customPrompt?: string;
    toolIds?: string[];
  }): Promise<string> {
    try {
      const systemPrompt = params.customPrompt || this.buildDefaultPrompt(
        params.businessId,
        params.locationId,
        params.businessName,
        params.businessType,
        params.locationName
      );
      const webhookUrl = `${process.env.AI_AGENT_SERVER_URL}/api/elevenlabs/webhook`;

      this.logger.log(`Creating Eleven Labs agent for ${params.businessName} - ${params.locationName} (businessId: ${params.businessId})`);
      this.logger.log(`Webhook URL: ${webhookUrl}`);

      // Conform documentației Eleven Labs - schema EXACTĂ
      const requestBody = {
        name: `${params.businessName} - ${params.locationName}`,
        tags: [params.businessType, params.businessId, params.locationId],
        
        conversation_config: {
          // Speech recognition (ASR)
          asr: {
            quality: 'high',
            provider: 'elevenlabs',
            user_input_audio_format: 'pcm_16000',
            keywords: [],
          },
          
          // Turn detection
          turn: {
            turn_timeout: 7.0,
            silence_end_call_timeout: -1, // -1 = disabled
            mode: 'turn',
          },
          
          // Text-to-Speech (TTS)
          tts: {
            model_id: 'eleven_turbo_v2_5', // TTS model pentru voice generation
            voice_id: params.voiceId,
            supported_voices: [],
            agent_output_audio_format: 'pcm_16000',
            optimize_streaming_latency: 3,
            stability: 0.5,
            speed: 1.0,
            similarity_boost: 0.75,
            pronunciation_dictionary_locators: [],
          },
          
          // Conversation settings
          conversation: {
            text_only: false,
            max_duration_seconds: 300,
            client_events: ['agent_response', 'user_transcript', 'interruption'],
          },
          
          // Language presets (optional)
          language_presets: {},
          
          // Voice Activity Detection
          vad: {
            background_voice_detection: false,
          },
          
          // Agent configuration
          agent: {
            first_message: params.greeting,
            language: 'ro',
            dynamic_variables: {
              dynamic_variable_placeholders: {},
            },
            disable_first_message_interruptions: false,
            prompt: {
              prompt: systemPrompt,
              llm: 'gpt-4o-mini', // LLM pentru reasoning (acceptă orice limbă)
              reasoning_effort: null,
              thinking_budget: null,
              temperature: 0.7,
              max_tokens: 1000,
              tool_ids: Array.isArray(params.toolIds) ? params.toolIds : [],
              built_in_tools: {
                end_call: null,
                language_detection: null,
                transfer_to_agent: null,
                transfer_to_number: null,
                skip_turn: null,
                play_keypad_touch_tone: null,
                voicemail_detection: null,
              },
              mcp_server_ids: [],
              native_mcp_server_ids: [],
              knowledge_base: [],
              custom_llm: null,
              ignore_default_personality: false,
              rag: {
                enabled: false,
                embedding_model: 'e5_mistral_7b_instruct',
                max_vector_distance: 0.6,
                max_documents_length: 50000,
                max_retrieved_rag_chunks_count: 20,
              },
              timezone: null,
              backup_llm_config: {
                preference: 'default',
              },
              tools: [], // Using direct client tools via tool_ids
            },
          },
        },
        
        platform_settings: {
          evaluation: {},
          widget: {},
          data_collection: {},
          overrides: {
            webhook: {
              url: webhookUrl,
              metadata: {
                businessId: params.businessId,
                locationId: params.locationId,
              },
            },
          },
          workspace_overrides: {},
          testing: {},
          archived: false,
          auth: {},
          call_limits: {},
          privacy: {
            store_user_audio: true,
            store_agent_audio: true,
            store_transcript: true,
          },
        },
      };

      this.logger.log(`Request body: ${JSON.stringify(requestBody, null, 2).substring(0, 800)}...`);

      const response = await axios.post(
        `${this.elevenLabsApiUrl}/convai/agents/create`,
        requestBody,
        {
          headers: {
            'xi-api-key': this.apiKey,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      const agentId = response.data.agent_id;
      this.logger.log(`✅ Created Eleven Labs agent: ${agentId} for ${params.businessName}`);
      this.logger.log(`Response: ${JSON.stringify(response.data)}`);

      return agentId;
    } catch (error) {
      this.logger.error('❌ Failed to create Eleven Labs agent:', error.response?.data || error.message);
      this.logger.error('Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
      });
      throw new BadRequestException(
        `Failed to create Eleven Labs agent: ${error.response?.data?.detail || error.message}`
      );
    }
  }

  /**
   * Generează greeting automat bazat pe business info
   */
  private generateDefaultGreeting(businessInfo: any, locationInfo: any): string {
    const businessType = businessInfo.businessType;
    const businessName = businessInfo.businessName;
    const locationName = locationInfo.name;

    switch (businessType) {
      case 'dental':
        return `Bună ziua! Sunt asistentul virtual al ${businessName}, locația ${locationName}. Cu ce vă pot ajuta astăzi? Puteți programa o consultație, puteți întreba despre serviciile noastre sau puteți verifica disponibilitatea.`;
      
      case 'gym':
        return `Salut! Sunt asistentul virtual al ${businessName}, sala ${locationName}. Te pot ajuta cu programări la antrenamente, informații despre abonamente sau cursurile noastre.`;
      
      case 'hotel':
        return `Bună ziua! Bine ați venit la ${businessName}, locația ${locationName}. Vă pot ajuta cu rezervări, informații despre camere sau serviciile hotelului nostru.`;
      
      default:
        return `Bună ziua! Sunt asistentul virtual al ${businessName}. Cu ce vă pot ajuta?`;
    }
  }

  /**
   * Obține voiceId default bazat pe limba business-ului
   */
  private getDefaultVoiceId(language: string): string {
    // Voices for Romanian
    if (language === 'ro' || language === 'romanian') {
      return '21m00Tcm4TlvDq8ikWAM'; // Rachel (neutral, professional)
    }
    
    // Default English voice
    return '21m00Tcm4TlvDq8ikWAM'; // Rachel
  }

  /**
   * Build default prompt pentru agent bazat pe business type
   * Include instrucțiuni pentru tool calling către ElevenLabs tools
   */
  private buildDefaultPrompt(
    businessId: string,
    locationId: string,
    businessName: string,
    businessType: 'dental' | 'gym' | 'hotel',
    locationName: string
  ): string {
    const basePrompt = `You are a helpful AI voice assistant for ${businessName}, location ${locationName}.`;

    const roleInstructions = {
      dental: `
You are assisting at a dental clinic. Your role:
- Help patients book appointments
- Answer questions about dental services (consultations, cleanings, treatments)
- Check doctor availability
- Provide general clinic information

Use the query_resources tool to get available services and treatments.`,

      gym: `
You are assisting at a gym/fitness center. Your role:
- Help members book training sessions
- Answer questions about membership plans and classes
- Check trainer and class availability
- Provide information about facilities and equipment

Use the query_resources tool to get available services and classes.`,

      hotel: `
You are assisting at a hotel. Your role:
- Help guests make room reservations
- Answer questions about rooms, amenities, and services
- Check room availability
- Provide information about hotel facilities

Use the query_resources tool to get available services and room types.`,
    };

    return `${basePrompt}

${roleInstructions[businessType]}

Important Guidelines:
- Be friendly, professional, and concise
- Keep responses SHORT for voice (2-3 sentences maximum)
- Speak naturally and conversationally, avoid bullet points or lists
- Use simple language, avoid technical jargon
- If you don't have information, offer to have staff call them back
- Always confirm important details by repeating them back

When helping with bookings:
1. Ask for their preferred date and time
2. Check availability using the system (you have access to tools)
3. Collect their name and phone number
4. Confirm all details clearly
5. Let them know they'll receive a confirmation message

You have access to the booking system and can query availability and create/cancel appointments using DIRECT tools.
Keep the conversation natural and flowing, as if speaking to a friend.

IMPORTANT: Always respond in Romanian (limba română) unless the customer speaks another language.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚙️ TOOL USAGE - ELEVEN LABS WEBHOOK TOOLS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You have access to three main tools configured as ElevenLabs webhook tools:

1. query_resources - Query medical resources (patients, treatments, medics)
2. query_patient_booking - Manage patient appointments (check availability, create bookings, cancel)
3. log_call_completion - Log completed calls (called automatically when call ends)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 TOOL 1: query_resources
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Use this tool to search for patients, treatments, or medics.

IMPORTANT: When searching for patients:
- If patient is found by name or phone, use their existing data
- If patient is NOT found, provide their name and phone number - they will be created automatically
- Always search first before creating new patients

EXAMPLES:
1) Search for patients by name:
Tool: query_resources
Payload:
{
  "toolName": "query_resources",
  "parameters": {
    "businessId": "${businessId}",
    "locationId": "${locationId}",
    "resourceType": "patient",
    "action": "search",
    "params": {
      "data.patientName": "John Doe",
      "limit": 10
    }
  },
  "metadata": {
    "businessId": "${businessId}",
    "locationId": "${locationId}"
  }
}

2) Search for patients by phone:
Tool: query_resources
Payload:
{
  "toolName": "query_resources",
  "parameters": {
    "businessId": "${businessId}",
    "locationId": "${locationId}",
    "resourceType": "patient",
    "action": "search",
    "params": {
      "data.phone": "+40712345678",
      "limit": 10
    }
  },
  "metadata": {
    "businessId": "${businessId}",
    "locationId": "${locationId}"
  }
}

3) List available treatments/services:
Tool: query_resources
Payload:
{
  "toolName": "query_resources",
  "parameters": {
    "businessId": "${businessId}",
    "locationId": "${locationId}",
    "resourceType": "treatment",
    "action": "list",
    "params": {
      "data.treatmentType": "consultation",
      "limit": 20
    }
  },
  "metadata": {
    "businessId": "${businessId}",
    "locationId": "${locationId}"
  }
}

4) Find available doctors:
Tool: query_resources
Payload:
{
  "toolName": "query_resources",
  "parameters": {
    "businessId": "${businessId}",
    "locationId": "${locationId}",
    "resourceType": "medic",
    "action": "search",
    "params": {
      "data.medicName": "Dr. Smith",
      "limit": 10
    }
  },
  "metadata": {
    "businessId": "${businessId}",
    "locationId": "${locationId}"
  }
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 TOOL 2: query_patient_booking
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Use this tool to manage patient appointments.

IMPORTANT: For booking appointments:
- Use service object with {id, name, duration, price} instead of serviceId
- Get available services first using query_resources tool
- Always check availability before creating bookings

EXAMPLES:
1) Check availability:
Tool: query_patient_booking
Payload:
{
  "toolName": "query_patient_booking",
  "parameters": {
    "businessId": "${businessId}",
    "locationId": "${locationId}",
    "action": "available-dates-with-slots",
    "params": {
      "from": "2025-01-17",
      "to": "2025-01-30",
      "service": {
        "id": "consultation_001",
        "name": "Consultație generală",
        "duration": 30,
        "price": 150
      }
    }
  },
  "metadata": {
    "businessId": "${businessId}",
    "locationId": "${locationId}"
  }
}

2) Create booking:
Tool: query_patient_booking
Payload:
{
  "toolName": "query_patient_booking",
  "parameters": {
    "businessId": "${businessId}",
    "locationId": "${locationId}",
    "action": "reserve",
    "params": {
      "date": "2025-01-20",
      "time": "10:00",
      "service": {
        "id": "consultation_001",
        "name": "Consultație generală",
        "duration": 30,
        "price": 150
      },
      "customer": {
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "+40712345678"
      }
    }
  },
  "metadata": {
    "businessId": "${businessId}",
    "locationId": "${locationId}"
  }
}

3) Cancel appointment:
Tool: query_patient_booking
Payload:
{
  "toolName": "query_patient_booking",
  "parameters": {
    "businessId": "${businessId}",
    "locationId": "${locationId}",
    "action": "cancel-appointment",
    "params": {
      "appointmentId": "apt_123456",
      "patientId": "patient_789",
      "accessCode": "123456"
    }
  },
  "metadata": {
    "businessId": "${businessId}",
    "locationId": "${locationId}"
  }
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 TOOL 3: log_call_completion
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This tool is called automatically when a call ends to log completion data.

EXAMPLES:
Tool: log_call_completion
Payload:
{
  "toolName": "log_call_completion",
  "parameters": {
    "businessId": "${businessId}",
    "locationId": "${locationId}",
    "conversationId": "conv_123456",
    "callDuration": 180,
    "cost": 0.15,
    "startTime": 1705123456,
    "status": "completed",
    "transcript": [
      {
        "role": "agent",
        "message": "Bună ziua! Cu ce vă pot ajuta?",
        "timeInCallSecs": 0
      },
      {
        "role": "user",
        "message": "Vreau să programez o consultație",
        "timeInCallSecs": 5
      }
    ],
    "metadata": {
      "callType": "appointment_booking",
      "outcome": "successful_booking"
    }
  },
  "metadata": {
    "businessId": "${businessId}",
    "locationId": "${locationId}"
  }
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 USAGE GUIDELINES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Always use the exact tool names: query_resources, query_patient_booking, log_call_completion
- Include businessId and locationId in both parameters and metadata
- For booking actions, always check availability first before creating appointments
- Use service object {id, name, duration, price} instead of serviceId for bookings
- Search for patients by name or phone first - if not found, they will be created automatically
- Get available services using query_resources tool instead of hardcoded lists
- Keep responses short (max 2-3 sentences) for voice interaction
- Confirm important details by repeating them back to the customer
- Never invent availability; always call the tools to get real data
- Use Romanian language unless customer speaks another language

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
  }
}
