import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class KinesisErrorHandlerService {
  private readonly logger = new Logger(KinesisErrorHandlerService.name);
  private connectionErrorLogged = false;
  private lastConnectionErrorTime = 0;
  private readonly ERROR_COOLDOWN_MS = 60000; // 1 minute cooldown between connection error logs

  /**
   * Handle Kinesis connection errors with deduplication
   */
  handleConnectionError(error: any, context: string): void {
    if (!error) {
      this.logger.warn(`Received null/undefined error in ${context}`);
      return;
    }

    const now = Date.now();
    const isConnectionError = this.isConnectionError(error);
    
    if (isConnectionError) {
      // Only log connection errors once per cooldown period
      if (!this.connectionErrorLogged || (now - this.lastConnectionErrorTime) > this.ERROR_COOLDOWN_MS) {
        this.logger.error(`Kinesis connection failed in ${context}:`, {
          message: error.message || 'Unknown error',
          code: error.code || 'UNKNOWN',
          name: error.name || 'Error',
          retryable: error.retryable || false,
        });
        
        this.connectionErrorLogged = true;
        this.lastConnectionErrorTime = now;
      }
    } else {
      // For non-connection errors, always log them
      this.logger.error(`Kinesis operation failed in ${context}:`, error);
    }
  }

  /**
   * Handle successful Kinesis operations to reset error state
   */
  handleSuccess(context: string): void {
    if (this.connectionErrorLogged) {
      this.logger.log(`Kinesis connection restored in ${context}`);
      this.connectionErrorLogged = false;
    }
  }

  /**
   * Check if an error is a connection-related error
   */
  private isConnectionError(error: any): boolean {
    if (!error) return false;

    const connectionErrorCodes = [
      'NetworkingError',
      'TimeoutError',
      'CredentialsError',
      'UnauthorizedOperation',
      'AccessDenied',
      'InvalidSignatureException',
      'ExpiredTokenException',
      'TokenRefreshRequired',
      'UnrecognizedClientException',
      'InvalidClientTokenId',
      'SignatureDoesNotMatch',
      'InvalidAccessKeyId',
      'InvalidToken',
    ];

    const connectionErrorMessages = [
      'connect',
      'connection',
      'timeout',
      'network',
      'credentials',
      'unauthorized',
      'access denied',
      'signature',
      'token',
      'security token',
      'invalid token',
      'unrecognized client',
      'invalid access key',
    ];

    // Check error code
    if (error.code && connectionErrorCodes.includes(error.code)) {
      return true;
    }

    // Check error name
    if (error.name && connectionErrorCodes.includes(error.name)) {
      return true;
    }

    // Check error message
    if (error.message) {
      const lowerMessage = error.message.toLowerCase();
      return connectionErrorMessages.some(keyword => lowerMessage.includes(keyword));
    }

    return false;
  }

  /**
   * Reset error state (useful for testing or manual reset)
   */
  resetErrorState(): void {
    this.connectionErrorLogged = false;
    this.lastConnectionErrorTime = 0;
  }
}
