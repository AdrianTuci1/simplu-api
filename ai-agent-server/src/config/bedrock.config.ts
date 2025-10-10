/**
 * AWS Bedrock Configuration
 * 
 * Configurează integrarea cu AWS Bedrock Agent și Knowledge Bases
 */

export const bedrockConfig = {
  // Bedrock Agent Configuration
  agentId: process.env.BEDROCK_AGENT_ID || '',
  agentAliasId: process.env.BEDROCK_AGENT_ALIAS_ID || 'TSTALIASID',
  
  // Bedrock Knowledge Base Configuration (pentru RAG)
  knowledgeBaseId: process.env.BEDROCK_KNOWLEDGE_BASE_ID || '',
  
  // AWS Region
  region: process.env.AWS_BEDROCK_REGION || process.env.AWS_REGION || 'us-east-1',
  
  // Model Configuration
  modelId: process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-5-sonnet-20240620-v1:0',
  
  // Performance Settings
  enableTrace: process.env.BEDROCK_ENABLE_TRACE !== 'false', // true by default
  timeout: parseInt(process.env.BEDROCK_TIMEOUT) || 60000, // 60 seconds
  
  // Knowledge Base Settings
  knowledgeBase: {
    numberOfResults: parseInt(process.env.BEDROCK_KB_RESULTS) || 5,
    minimumScore: parseFloat(process.env.BEDROCK_KB_MIN_SCORE) || 0.7,
  },
};

/**
 * Validează configurația Bedrock
 */
export function validateBedrockConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!bedrockConfig.agentId) {
    errors.push('BEDROCK_AGENT_ID is required');
  }

  if (!bedrockConfig.region) {
    errors.push('AWS_BEDROCK_REGION or AWS_REGION is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

