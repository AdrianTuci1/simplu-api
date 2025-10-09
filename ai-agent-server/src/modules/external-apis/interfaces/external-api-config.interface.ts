export interface SMSTemplate {
  id: string;
  name: string;
  content: string;
  variables: string[]; // e.g., ['patientName', 'appointmentDate', 'appointmentTime']
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  variables: string[]; // e.g., ['patientName', 'appointmentDate', 'appointmentTime', 'businessName']
}

export interface SMSConfig {
  enabled: boolean;
  sendOnBooking: boolean;
  sendReminder: boolean;
  reminderTiming: 'day_before' | 'same_day' | 'both';
  defaultTemplate: string; // template ID
  templates: SMSTemplate[];
  serviceType: 'aws_sns' | 'twilio' | 'meta';
}

export interface EmailConfig {
  enabled: boolean;
  sendOnBooking: boolean;
  sendReminder: boolean;
  reminderTiming: 'day_before' | 'same_day' | 'both';
  defaultTemplate: string; // template ID
  templates: EmailTemplate[];
  serviceType: 'gmail' | 'smtp';
  senderName?: string;
}

export interface ExternalApiConfig {
  businessId: string;
  locationId?: string; // Optional for location-specific configs
  sms: SMSConfig;
  email: EmailConfig;
  createdAt: string;
  updatedAt: string;
  version: number; // For optimistic locking
}

export interface CreateExternalApiConfigDto {
  businessId: string;
  locationId?: string;
  sms?: Partial<SMSConfig>;
  email?: Partial<EmailConfig>;
}

export interface UpdateExternalApiConfigDto {
  sms?: Partial<SMSConfig>;
  email?: Partial<EmailConfig>;
}

export interface TemplateVariable {
  name: string;
  description: string;
  example: string;
  required: boolean;
}

export const COMMON_TEMPLATE_VARIABLES: TemplateVariable[] = [
  {
    name: 'patientName',
    description: 'Numele pacientului',
    example: 'Ion Popescu',
    required: true
  },
  {
    name: 'appointmentDate',
    description: 'Data programării',
    example: '15 ianuarie 2024',
    required: true
  },
  {
    name: 'appointmentTime',
    description: 'Ora programării',
    example: '14:30',
    required: true
  },
  {
    name: 'businessName',
    description: 'Numele afacerii',
    example: 'Cabinet Medical Dr. Popescu',
    required: false
  },
  {
    name: 'locationName',
    description: 'Numele locației',
    example: 'Cabinet Principal',
    required: false
  },
  {
    name: 'serviceName',
    description: 'Numele serviciului',
    example: 'Consult medic general',
    required: false
  },
  {
    name: 'doctorName',
    description: 'Numele doctorului',
    example: 'Dr. Popescu',
    required: false
  },
  {
    name: 'phoneNumber',
    description: 'Numărul de telefon pentru contact',
    example: '+40 721 234 567',
    required: false
  },
  {
    name: 'address',
    description: 'Adresa locației',
    example: 'Str. Principală nr. 10, București',
    required: false
  },
  {
    name: 'accessCode',
    description: 'Codul de acces pentru pacient (6 cifre)',
    example: '123456',
    required: false
  },
  {
    name: 'patientUrl',
    description: 'URL-ul pentru pagina pacientului',
    example: 'https://clinica-alfa.simplu.io/sediu-central/details?patient00000',
    required: false
  }
];
