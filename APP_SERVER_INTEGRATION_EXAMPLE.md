# App Server Integration Example

Acest fișier conține exemple concrete de integrare între app server și ai-agent-server pentru automatizarea mesajelor.

## 🔄 Fluxul de Integrare

```
App Server → AI Agent Server → External APIs (SMS/Email)
     ↓              ↓                    ↓
1. Creează      2. Verifică          3. Trimite
   programare      configurația         mesajele
```

## 📝 Implementare în App Server

### 1. Service pentru Automatizare Mesaje

```typescript
// src/services/message-automation.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface AppointmentData {
  patientName: string;
  patientPhone?: string;
  patientEmail?: string;
  appointmentDate: string;
  appointmentTime: string;
  businessName: string;
  locationName?: string;
  serviceName: string;
  doctorName: string;
  phoneNumber?: string;
}

@Injectable()
export class MessageAutomationService {
  private readonly logger = new Logger(MessageAutomationService.name);
  private readonly aiAgentUrl: string;

  constructor(private configService: ConfigService) {
    this.aiAgentUrl = this.configService.get('AI_AGENT_SERVER_URL');
  }

  async sendBookingConfirmation(
    businessId: string,
    appointmentData: AppointmentData,
    locationId?: string
  ): Promise<boolean> {
    try {
      this.logger.log(`Sending booking confirmation for business ${businessId}, location ${locationId}`);

      const response = await fetch(
        `${this.aiAgentUrl}/message-automation/${businessId}/send-booking-confirmation?locationId=${locationId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.configService.get('AI_AGENT_API_KEY')}` // dacă folosești auth
          },
          body: JSON.stringify(appointmentData)
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      this.logger.log(`Booking confirmation sent successfully: ${JSON.stringify(result)}`);
      
      return result.every((msg: any) => msg.success);
    } catch (error) {
      this.logger.error(`Failed to send booking confirmation: ${error.message}`);
      return false;
    }
  }

  async sendReminderMessage(
    businessId: string,
    appointmentData: AppointmentData,
    reminderType: 'day_before' | 'same_day',
    locationId?: string
  ): Promise<boolean> {
    try {
      this.logger.log(`Sending ${reminderType} reminder for business ${businessId}`);

      const response = await fetch(
        `${this.aiAgentUrl}/message-automation/${businessId}/send-reminder?locationId=${locationId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.configService.get('AI_AGENT_API_KEY')}`
          },
          body: JSON.stringify({
            appointmentData,
            reminderType
          })
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      this.logger.log(`Reminder sent successfully: ${JSON.stringify(result)}`);
      
      return result.every((msg: any) => msg.success);
    } catch (error) {
      this.logger.error(`Failed to send reminder: ${error.message}`);
      return false;
    }
  }

  async checkAutomationStatus(
    businessId: string,
    locationId?: string
  ): Promise<{
    smsEnabled: boolean;
    emailEnabled: boolean;
    sendOnBooking: boolean;
    sendReminders: boolean;
  }> {
    try {
      const response = await fetch(
        `${this.aiAgentUrl}/message-automation/${businessId}/automation-status?locationId=${locationId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.configService.get('AI_AGENT_API_KEY')}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      this.logger.error(`Failed to check automation status: ${error.message}`);
      return {
        smsEnabled: false,
        emailEnabled: false,
        sendOnBooking: false,
        sendReminders: false
      };
    }
  }
}
```

### 2. Integration în Patient Booking Service

```typescript
// src/modules/patient-booking/patient-booking.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { MessageAutomationService } from '../../services/message-automation.service';

@Injectable()
export class PatientBookingService {
  private readonly logger = new Logger(PatientBookingService.name);

  constructor(
    private readonly messageAutomationService: MessageAutomationService,
    // ... alte dependencies
  ) {}

  async createAppointment(createAppointmentDto: CreateAppointmentDto): Promise<Appointment> {
    try {
      // 1. Creează programarea în baza de date
      const appointment = await this.saveAppointment(createAppointmentDto);
      
      // 2. Trimite mesaje automate (doar dacă este o programare nouă)
      await this.sendAutomatedMessages(appointment);
      
      return appointment;
    } catch (error) {
      this.logger.error(`Failed to create appointment: ${error.message}`);
      throw error;
    }
  }

  async updateAppointment(id: string, updateAppointmentDto: UpdateAppointmentDto): Promise<Appointment> {
    try {
      const oldAppointment = await this.findAppointmentById(id);
      const updatedAppointment = await this.saveAppointment({ ...oldAppointment, ...updateAppointmentDto });
      
      // Trimite mesaje automate dacă s-a schimbat data/ora
      if (this.shouldSendReminder(oldAppointment, updatedAppointment)) {
        await this.sendAutomatedMessages(updatedAppointment, 'update');
      }
      
      return updatedAppointment;
    } catch (error) {
      this.logger.error(`Failed to update appointment: ${error.message}`);
      throw error;
    }
  }

  private async sendAutomatedMessages(
    appointment: Appointment, 
    messageType: 'create' | 'update' = 'create'
  ): Promise<void> {
    try {
      // Construiește datele pentru mesaj
      const appointmentData = this.buildAppointmentData(appointment);
      
      if (messageType === 'create') {
        // Trimite confirmare la crearea programării
        const success = await this.messageAutomationService.sendBookingConfirmation(
          appointment.businessId,
          appointmentData,
          appointment.locationId
        );
        
        if (success) {
          this.logger.log(`Booking confirmation sent for appointment ${appointment.id}`);
        }
      }
      
      // Programează reminder-urile (dacă este necesar)
      await this.scheduleReminders(appointment, appointmentData);
      
    } catch (error) {
      this.logger.error(`Failed to send automated messages: ${error.message}`);
      // Nu aruncă eroarea pentru a nu afecta crearea programării
    }
  }

  private buildAppointmentData(appointment: Appointment) {
    return {
      patientName: appointment.patientName,
      patientPhone: appointment.patientPhone,
      patientEmail: appointment.patientEmail,
      appointmentDate: this.formatDate(appointment.date),
      appointmentTime: this.formatTime(appointment.time),
      businessName: appointment.business?.name || '',
      locationName: appointment.location?.name || '',
      serviceName: appointment.service?.name || '',
      doctorName: appointment.doctor?.name || '',
      phoneNumber: appointment.business?.phoneNumber || ''
    };
  }

  private async scheduleReminders(appointment: Appointment, appointmentData: any): Promise<void> {
    try {
      const appointmentDate = new Date(appointment.date);
      const now = new Date();
      
      // Calculează când să trimită reminder-urile
      const dayBefore = new Date(appointmentDate);
      dayBefore.setDate(dayBefore.getDate() - 1);
      
      const sameDay = new Date(appointmentDate);
      sameDay.setHours(9, 0, 0, 0); // 9:00 în dimineața programării
      
      // Programează reminder cu o zi înainte
      if (dayBefore > now) {
        this.scheduleReminderMessage(
          appointment,
          appointmentData,
          'day_before',
          dayBefore
        );
      }
      
      // Programează reminder în ziua respectivă
      if (sameDay > now) {
        this.scheduleReminderMessage(
          appointment,
          appointmentData,
          'same_day',
          sameDay
        );
      }
      
    } catch (error) {
      this.logger.error(`Failed to schedule reminders: ${error.message}`);
    }
  }

  private scheduleReminderMessage(
    appointment: Appointment,
    appointmentData: any,
    reminderType: 'day_before' | 'same_day',
    scheduledTime: Date
  ): void {
    // Folosește un job scheduler (ex: Bull, Agenda, etc.)
    // Sau un cron job pentru a trimite reminder-urile la timpul programat
    
    // Exemplu cu setTimeout (nu recomandat pentru producție)
    const delay = scheduledTime.getTime() - Date.now();
    
    if (delay > 0) {
      setTimeout(async () => {
        try {
          await this.messageAutomationService.sendReminderMessage(
            appointment.businessId,
            appointmentData,
            reminderType,
            appointment.locationId
          );
        } catch (error) {
          this.logger.error(`Failed to send ${reminderType} reminder: ${error.message}`);
        }
      }, delay);
    }
  }

  private shouldSendReminder(oldAppointment: Appointment, newAppointment: Appointment): boolean {
    return (
      oldAppointment.date !== newAppointment.date ||
      oldAppointment.time !== newAppointment.time ||
      oldAppointment.patientPhone !== newAppointment.patientPhone ||
      oldAppointment.patientEmail !== newAppointment.patientEmail
    );
  }

  private formatDate(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleDateString('ro-RO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  private formatTime(time: string): string {
    return time;
  }
}
```

### 3. Cron Job pentru Reminder-uri

```typescript
// src/tasks/reminder-scheduler.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MessageAutomationService } from '../services/message-automation.service';

@Injectable()
export class ReminderSchedulerService {
  private readonly logger = new Logger(ReminderSchedulerService.name);

  constructor(
    @InjectModel('Appointment') private appointmentModel: Model<any>,
    private readonly messageAutomationService: MessageAutomationService
  ) {}

  // Rulează la fiecare oră pentru a verifica reminder-urile
  @Cron(CronExpression.EVERY_HOUR)
  async checkReminders(): Promise<void> {
    try {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      // Găsește programările pentru mâine (reminder cu o zi înainte)
      const appointmentsTomorrow = await this.appointmentModel.find({
        date: {
          $gte: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate()),
          $lt: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate() + 1)
        },
        status: 'confirmed'
      }).populate('business location doctor service');

      // Găsește programările pentru astăzi (reminder în ziua respectivă)
      const appointmentsToday = await this.appointmentModel.find({
        date: {
          $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
          $lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
        },
        status: 'confirmed'
      }).populate('business location doctor service');

      // Trimite reminder-uri
      await this.sendDayBeforeReminders(appointmentsTomorrow);
      await this.sendSameDayReminders(appointmentsToday);
      
    } catch (error) {
      this.logger.error(`Error in reminder scheduler: ${error.message}`);
    }
  }

  private async sendDayBeforeReminders(appointments: any[]): Promise<void> {
    for (const appointment of appointments) {
      try {
        const appointmentData = this.buildAppointmentData(appointment);
        
        await this.messageAutomationService.sendReminderMessage(
          appointment.businessId,
          appointmentData,
          'day_before',
          appointment.locationId
        );
        
        this.logger.log(`Day before reminder sent for appointment ${appointment.id}`);
      } catch (error) {
        this.logger.error(`Failed to send day before reminder for appointment ${appointment.id}: ${error.message}`);
      }
    }
  }

  private async sendSameDayReminders(appointments: any[]): Promise<void> {
    for (const appointment of appointments) {
      try {
        const appointmentData = this.buildAppointmentData(appointment);
        
        await this.messageAutomationService.sendReminderMessage(
          appointment.businessId,
          appointmentData,
          'same_day',
          appointment.locationId
        );
        
        this.logger.log(`Same day reminder sent for appointment ${appointment.id}`);
      } catch (error) {
        this.logger.error(`Failed to send same day reminder for appointment ${appointment.id}: ${error.message}`);
      }
    }
  }

  private buildAppointmentData(appointment: any) {
    return {
      patientName: appointment.patientName,
      patientPhone: appointment.patientPhone,
      patientEmail: appointment.patientEmail,
      appointmentDate: this.formatDate(appointment.date),
      appointmentTime: this.formatTime(appointment.time),
      businessName: appointment.business?.name || '',
      locationName: appointment.location?.name || '',
      serviceName: appointment.service?.name || '',
      doctorName: appointment.doctor?.name || '',
      phoneNumber: appointment.business?.phoneNumber || ''
    };
  }

  private formatDate(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleDateString('ro-RO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  private formatTime(time: string): string {
    return time;
  }
}
```

### 4. Module Configuration

```typescript
// src/modules/patient-booking/patient-booking.module.ts
import { Module } from '@nestjs/common';
import { PatientBookingService } from './patient-booking.service';
import { PatientBookingController } from './patient-booking.controller';
import { MessageAutomationService } from '../../services/message-automation.service';
import { ReminderSchedulerService } from '../../tasks/reminder-scheduler.service';

@Module({
  providers: [
    PatientBookingService,
    MessageAutomationService,
    ReminderSchedulerService
  ],
  controllers: [PatientBookingController],
  exports: [PatientBookingService]
})
export class PatientBookingModule {}
```

### 5. Environment Variables

```env
# .env
AI_AGENT_SERVER_URL=http://localhost:3001
AI_AGENT_API_KEY=your-api-key-here
```

## 🔧 Configurare și Testare

### 1. Testare Manuală

```bash
# Testează trimiterea unei confirmări
curl -X POST http://localhost:3000/api/appointments \
  -H "Content-Type: application/json" \
  -d '{
    "patientName": "Test Patient",
    "patientPhone": "+40721234567",
    "patientEmail": "test@example.com",
    "date": "2024-01-15",
    "time": "14:30",
    "businessId": "business-123",
    "locationId": "location-456",
    "serviceId": "service-789"
  }'
```

### 2. Monitoring și Logs

```typescript
// Adaugă în main.ts pentru logging
import { Logger } from '@nestjs/common';

const logger = new Logger('App');

// Log toate request-urile către AI Agent Server
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
```

## 📊 Monitoring și Analytics

### 1. Metrics Collection

```typescript
// src/services/metrics.service.ts
@Injectable()
export class MetricsService {
  private readonly messageMetrics = new Map<string, number>();

  incrementMessageSent(type: 'sms' | 'email', businessId: string): void {
    const key = `${type}:${businessId}`;
    this.messageMetrics.set(key, (this.messageMetrics.get(key) || 0) + 1);
  }

  getMessageStats(): Record<string, number> {
    return Object.fromEntries(this.messageMetrics);
  }
}
```

### 2. Error Tracking

```typescript
// Adaugă în MessageAutomationService
private async handleError(error: Error, context: string): Promise<void> {
  this.logger.error(`${context}: ${error.message}`, error.stack);
  
  // Trimite notificare către admin
  await this.notifyAdmin({
    type: 'message_automation_error',
    context,
    error: error.message,
    timestamp: new Date()
  });
}
```

Această implementare oferă o integrare completă între app server și ai-agent-server pentru automatizarea mesajelor, cu suport pentru confirmări și reminder-uri.
