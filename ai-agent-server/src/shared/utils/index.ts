import { v4 as uuidv4 } from 'uuid';

// Generate unique ID
export const generateId = (): string => {
  return uuidv4();
};

// Generate timestamp
export const generateTimestamp = (): string => {
  return new Date().toISOString();
};

// Validate business type
export const isValidBusinessType = (type: string): boolean => {
  const validTypes = ['dental', 'gym', 'hotel'];
  return validTypes.includes(type);
};

// Validate message type
export const isValidMessageType = (type: string): boolean => {
  const validTypes = ['text', 'image', 'audio', 'document'];
  return validTypes.includes(type);
};

// Format error response
export const formatErrorResponse = (error: string, code?: string) => {
  return {
    success: false,
    error,
    code,
    timestamp: generateTimestamp(),
  };
};

// Format success response
export const formatSuccessResponse = (data: any) => {
  return {
    success: true,
    data,
    timestamp: generateTimestamp(),
  };
};

// Sanitize phone number
export const sanitizePhoneNumber = (phone: string): string => {
  return phone.replace(/[^\d+]/g, '');
};

// Validate email
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Deep clone object
export const deepClone = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj));
};

// Retry function with exponential backoff
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: Error;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i === maxRetries - 1) throw lastError;
      
      const delay = baseDelay * Math.pow(2, i);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}; 