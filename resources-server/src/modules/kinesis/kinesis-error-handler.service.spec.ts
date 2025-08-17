import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { KinesisErrorHandlerService } from './kinesis-error-handler.service';

describe('KinesisErrorHandlerService', () => {
  let service: KinesisErrorHandlerService;
  let loggerSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [KinesisErrorHandlerService],
    }).compile();

    service = module.get<KinesisErrorHandlerService>(KinesisErrorHandlerService);
    
    // Spy on logger methods
    loggerSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
    service.resetErrorState();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should log connection errors only once per cooldown period', () => {
    const connectionError = {
      name: 'NetworkingError',
      message: 'Connection timeout',
      code: 'NetworkingError',
    };

    // First error should be logged
    service.handleConnectionError(connectionError, 'test-context');
    expect(loggerSpy).toHaveBeenCalledTimes(1);

    // Second error within cooldown should not be logged
    service.handleConnectionError(connectionError, 'test-context');
    expect(loggerSpy).toHaveBeenCalledTimes(1);

    // Reset and try again
    service.resetErrorState();
    service.handleConnectionError(connectionError, 'test-context');
    expect(loggerSpy).toHaveBeenCalledTimes(2);
  });

  it('should always log non-connection errors', () => {
    const nonConnectionError = {
      name: 'ValidationError',
      message: 'Invalid data format',
    };

    service.handleConnectionError(nonConnectionError, 'test-context');
    expect(loggerSpy).toHaveBeenCalledTimes(1);

    service.handleConnectionError(nonConnectionError, 'test-context');
    expect(loggerSpy).toHaveBeenCalledTimes(2);
  });

  it('should detect connection errors by code', () => {
    const connectionErrors = [
      { code: 'NetworkingError' },
      { code: 'TimeoutError' },
      { code: 'CredentialsError' },
      { code: 'UnauthorizedOperation' },
    ];

    connectionErrors.forEach(error => {
      service.handleConnectionError(error, 'test-context');
    });

    // Should only log once due to deduplication
    expect(loggerSpy).toHaveBeenCalledTimes(1);
  });

  it('should detect connection errors by name', () => {
    const connectionErrors = [
      { name: 'NetworkingError' },
      { name: 'TimeoutError' },
      { name: 'CredentialsError' },
    ];

    connectionErrors.forEach(error => {
      service.handleConnectionError(error, 'test-context');
    });

    // Should only log once due to deduplication
    expect(loggerSpy).toHaveBeenCalledTimes(1);
  });

  it('should detect connection errors by message', () => {
    const connectionErrors = [
      { message: 'Connection failed' },
      { message: 'Network timeout' },
      { message: 'Invalid credentials' },
    ];

    connectionErrors.forEach(error => {
      service.handleConnectionError(error, 'test-context');
    });

    // Should only log once due to deduplication
    expect(loggerSpy).toHaveBeenCalledTimes(1);
  });

  it('should reset error state on success', () => {
    const connectionError = {
      name: 'NetworkingError',
      message: 'Connection timeout',
    };

    // Log connection error
    service.handleConnectionError(connectionError, 'test-context');
    expect(loggerSpy).toHaveBeenCalledTimes(1);

    // Reset on success
    service.handleSuccess('test-context');
    
    // Next connection error should be logged again
    service.handleConnectionError(connectionError, 'test-context');
    expect(loggerSpy).toHaveBeenCalledTimes(2);
  });
});
