export const webhooksConfig = {
  // Configurare Meta Webhook
  meta: {
    verifyToken: process.env.META_WEBHOOK_VERIFY_TOKEN || 'default_verify_token',
    signatureHeader: 'x-hub-signature-256',
    signatureAlgorithm: 'sha256',
    challengeTimeout: 5000, // 5 secunde
    accessToken: process.env.META_ACCESS_TOKEN,
    phoneNumberId: process.env.META_PHONE_NUMBER_ID,
    appSecret: process.env.META_APP_SECRET,
  },

  // Configurare Twilio Webhook
  twilio: {
    validateRequest: true,
    timeout: 10000, // 10 secunde
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
  },

  // Configurare generală webhooks
  general: {
    maxPayloadSize: '10mb',
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minute
      max: 100, // max 100 requests per windowMs
    },
    timeout: 30000, // 30 secunde
    retryAttempts: 3,
    retryDelay: 1000, // 1 secundă
  },

  // Configurare logging
  logging: {
    enabled: true,
    level: process.env.WEBHOOK_LOG_LEVEL || 'info',
    includeHeaders: ['x-hub-signature-256', 'user-agent'],
    excludeSensitiveData: true,
  },

  // Configurare securitate
  security: {
    validateSignature: true,
    requireBusinessId: true,
    allowedSources: ['meta', 'twilio'],
    blockUnknownSources: true,
  },

  // Configurare procesare
  processing: {
    enableAutonomousActions: true,
    enableAutoResponse: true,
    maxProcessingTime: 25000, // 25 secunde
    enableFallback: true,
  },

  // Configurare notificări
  notifications: {
    enableCoordinatorNotifications: true,
    enableErrorNotifications: true,
    notificationChannels: ['websocket', 'email'],
  },
};

export default webhooksConfig; 