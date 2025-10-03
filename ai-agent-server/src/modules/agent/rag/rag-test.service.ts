import { Injectable } from '@nestjs/common';
import { SimplifiedRagService } from './simplified-rag.service';
import { ResourceRagService } from './resource-rag.service';

@Injectable()
export class RagTestService {
  constructor(
    private readonly simplifiedRagService: SimplifiedRagService,
    private readonly resourceRagService: ResourceRagService
  ) {}

  // Test RAG pentru operator.dental.general
  async testOperatorDentalRag() {
    console.log('🧪 Testing operator.dental.general RAG...');
    
    const ragContext = {
      businessType: 'dental' as const,
      role: 'operator' as const,
      businessId: 'test-business-123',
      locationId: 'default',
      userId: 'test-operator-456',
      message: 'Salut! Cu ce te pot ajuta astăzi?',
      sessionId: 'test-session-789',
      source: 'websocket' as const
    };

    try {
      const result = await this.simplifiedRagService.getRagForRoleAndBusiness(
        ragContext.businessType,
        ragContext.role,
        ragContext
      );

      console.log('✅ Operator Dental RAG Result:', {
        instructions: result.instructions,
        resources: result.resources,
        response: result.response
      });

      return result;
    } catch (error) {
      console.error('❌ Error testing operator dental RAG:', error);
      throw error;
    }
  }

  // Test RAG pentru customer.dental.general
  async testCustomerDentalRag() {
    console.log('🧪 Testing customer.dental.general RAG...');
    
    const ragContext = {
      businessType: 'dental' as const,
      role: 'customer' as const,
      businessId: 'test-business-123',
      locationId: 'default',
      userId: 'test-customer-456',
      message: 'Bună! Vreau să fac o programare.',
      sessionId: 'test-session-789',
      source: 'webhook' as const
    };

    try {
      const result = await this.simplifiedRagService.getRagForRoleAndBusiness(
        ragContext.businessType,
        ragContext.role,
        ragContext
      );

      console.log('✅ Customer Dental RAG Result:', {
        instructions: result.instructions,
        resources: result.resources,
        response: result.response
      });

      return result;
    } catch (error) {
      console.error('❌ Error testing customer dental RAG:', error);
      throw error;
    }
  }

  // Test RAG pentru resurse dental
  async testDentalResourceRag() {
    console.log('🧪 Testing dental resource RAG...');
    
    const resourceContext = {
      businessType: 'dental' as const,
      resourceType: 'appointment',
      businessId: 'test-business-123',
      locationId: 'default',
      userId: 'test-user-456',
      message: 'Vreau să văd programările disponibile',
      sessionId: 'test-session-789'
    };

    try {
      const result = await this.resourceRagService.getResourceRag(
        resourceContext.businessType,
        resourceContext.resourceType,
        resourceContext
      );

      console.log('✅ Dental Resource RAG Result:', {
        resourceKey: result.resourceKey,
        instructions: result.instructions,
        data: result.data,
        actions: result.actions,
        response: result.response
      });

      return result;
    } catch (error) {
      console.error('❌ Error testing dental resource RAG:', error);
      throw error;
    }
  }

  // Test complet pentru toate scenariile
  async runAllTests() {
    console.log('🚀 Running all RAG tests...');
    
    try {
      await this.testOperatorDentalRag();
      await this.testCustomerDentalRag();
      await this.testDentalResourceRag();
      
      console.log('✅ All RAG tests completed successfully!');
    } catch (error) {
      console.error('❌ Some RAG tests failed:', error);
      throw error;
    }
  }
}
