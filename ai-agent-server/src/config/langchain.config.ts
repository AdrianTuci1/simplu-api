export const langchainConfig = {
  modelName: process.env.OPENAI_MODEL_NAME || 'gpt-4o-mini',
  temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.1'),
  maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '8192'),
  topP: parseFloat(process.env.OPENAI_TOP_P || '0.8'),
  
  // RAG Configuration
  rag: {
    chunkSize: 1000,
    chunkOverlap: 200,
    similarityThreshold: 0.7,
  },
  
  // Memory Configuration
  memory: {
    maxTokens: 4000,
    returnMessages: true,
  },
}; 