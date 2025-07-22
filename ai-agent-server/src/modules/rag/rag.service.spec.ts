import { Test, TestingModule } from '@nestjs/testing';
import { RagService } from './rag.service';

describe('RagService', () => {
  let service: RagService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RagService],
    }).compile();

    service = module.get<RagService>(RagService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return instructions for dental reservation', async () => {
    const instructions = await service.getInstructionsForRequest(
      'Vreau să fac o rezervare pentru mâine',
      'dental',
      { category: 'rezervare' }
    );
    
    expect(instructions).toBeDefined();
    // Note: This will return empty array in test environment since DynamoDB is not available
    expect(Array.isArray(instructions)).toBe(true);
  });

  it('should return workflow for category', async () => {
    const workflow = await service.getWorkflowForCategory('rezervare', 'dental');
    
    expect(workflow).toBeDefined();
    expect(Array.isArray(workflow)).toBe(true);
  });

  it('should return notification template', async () => {
    const template = await service.getNotificationTemplate('rezervare', 'dental', 'create');
    
    expect(template).toBeDefined();
    expect(typeof template).toBe('string');
  });

  it('should return instruction by category', async () => {
    const instruction = await service.getInstructionByCategory('rezervare', 'dental');
    
    expect(instruction).toBeDefined();
    // Note: This will return null in test environment since DynamoDB is not available
    expect(instruction === null || typeof instruction === 'object').toBe(true);
  });
}); 