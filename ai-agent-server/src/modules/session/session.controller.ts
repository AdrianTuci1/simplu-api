import { Controller, Get, Param, Query, Logger } from '@nestjs/common';
import { SessionService } from './session.service';
import { Session, Message } from '@/shared/interfaces/session.interface';

@Controller('api/sessions')
export class SessionController {
  private readonly logger = new Logger(SessionController.name);

  constructor(private readonly sessionService: SessionService) {}

  @Get(':sessionId')
  async getSession(@Param('sessionId') sessionId: string): Promise<Session | null> {
    this.logger.log(`Getting session: ${sessionId}`);
    
    try {
      const session = await this.sessionService.getSession(sessionId);
      if (!session) {
        this.logger.warn(`Session not found: ${sessionId}`);
      }
      return session;
    } catch (error) {
      this.logger.error(`Error getting session ${sessionId}:`, error);
      throw error;
    }
  }

  @Get(':sessionId/messages')
  async getSessionMessages(
    @Param('sessionId') sessionId: string,
    @Query('limit') limit?: string
  ): Promise<Message[]> {
    this.logger.log(`Getting messages for session: ${sessionId}`);
    
    try {
      const messageLimit = limit ? parseInt(limit, 10) : 50;
      const messages = await this.sessionService.getSessionMessages(sessionId, messageLimit);
      
      this.logger.log(`Retrieved ${messages.length} messages for session ${sessionId}`);
      return messages;
    } catch (error) {
      this.logger.error(`Error getting messages for session ${sessionId}:`, error);
      throw error;
    }
  }

  @Get('business/:businessId/active')
  async getActiveSessionsForBusiness(
    @Param('businessId') businessId: string
  ): Promise<Session[]> {
    this.logger.log(`Getting active sessions for business: ${businessId}`);
    
    try {
      const sessions = await this.sessionService.getActiveSessionsForBusiness(businessId);
      this.logger.log(`Retrieved ${sessions.length} active sessions for business ${businessId}`);
      return sessions;
    } catch (error) {
      this.logger.error(`Error getting active sessions for business ${businessId}:`, error);
      throw error;
    }
  }

  @Get('business/:businessId/user/:userId/active')
  async getActiveSessionForUser(
    @Param('businessId') businessId: string,
    @Param('userId') userId: string
  ): Promise<Session | null> {
    this.logger.log(`Getting active session for user ${userId} in business ${businessId}`);
    
    try {
      const session = await this.sessionService.getActiveSessionForUser(businessId, userId);
      if (!session) {
        this.logger.warn(`No active session found for user ${userId} in business ${businessId}`);
      }
      return session;
    } catch (error) {
      this.logger.error(`Error getting active session for user ${userId} in business ${businessId}:`, error);
      throw error;
    }
  }

  @Get('business/:businessId/user/:userId/history')
  async getSessionHistoryForUser(
    @Param('businessId') businessId: string,
    @Param('userId') userId: string,
    @Query('limit') limit?: string
  ): Promise<Session[]> {
    this.logger.log(`Getting session history for user ${userId} in business ${businessId}`);
    
    try {
      const sessionLimit = limit ? parseInt(limit, 10) : 20;
      const sessions = await this.sessionService.getSessionHistoryForUser(businessId, userId, sessionLimit);
      
      this.logger.log(`Retrieved ${sessions.length} sessions for user ${userId} in business ${businessId}`);
      return sessions;
    } catch (error) {
      this.logger.error(`Error getting session history for user ${userId} in business ${businessId}:`, error);
      throw error;
    }
  }

  @Get('test/create-session/:businessId/:userId')
  async testCreateSession(
    @Param('businessId') businessId: string,
    @Param('userId') userId: string
  ): Promise<Session> {
    this.logger.log(`Testing session creation for user ${userId} in business ${businessId}`);
    
    try {
      const session = await this.sessionService.createSession(
        businessId,
        'L0100001', // Default location
        userId,
        'general'
      );
      this.logger.log(`✅ Test session created: ${session.sessionId}`);
      return session;
    } catch (error) {
      this.logger.error(`Error creating test session:`, error);
      throw error;
    }
  }

  @Get('test/get-active-session/:businessId/:userId')
  async testGetActiveSession(
    @Param('businessId') businessId: string,
    @Param('userId') userId: string
  ): Promise<Session | null> {
    this.logger.log(`Testing get active session for user ${userId} in business ${businessId}`);
    
    try {
      const session = await this.sessionService.getActiveSessionForUser(businessId, userId);
      if (session) {
        this.logger.log(`✅ Found active session: ${session.sessionId}`);
      } else {
        this.logger.log(`❌ No active session found`);
      }
      return session;
    } catch (error) {
      this.logger.error(`Error getting active session:`, error);
      throw error;
    }
  }
}
