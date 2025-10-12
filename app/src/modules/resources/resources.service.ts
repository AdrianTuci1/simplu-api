import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { KinesisService, ResourceOperation } from '../../kinesis.service';
import {
  VALID_RESOURCE_TYPES,
  ResourceType,
  ResourceAction,
} from './types/base-resource';
import {
  AuthenticatedUser,
} from './services/permission.service';
import { MessageAutomationService, AppointmentData } from '../../services/message-automation.service';
import { ExternalApiConfigService } from '../../services/external-api-config.service';
import { BusinessInfoService } from '../business-info/business-info.service';
import { PatientAccessService } from '../patient-booking/patient-access.service';
import { v4 as uuidv4 } from 'uuid';

interface ResourceOperationRequest {
  operation: ResourceAction;
  businessId: string;
  locationId: string;
  resourceType?: ResourceType;
  resourceId?: string;
  data?: Record<string, unknown>; // The actual resource data with proper typing
  user?: AuthenticatedUser; // User data from Lambda authorizer
}

interface StandardResponse {
  success: boolean;
  message: string;
  requestId: string;
  timestamp: string;
}

@Injectable()
export class ResourcesService {
  private readonly logger = new Logger(ResourcesService.name);

  constructor(
    private readonly kinesisService: KinesisService,
    private readonly messageAutomationService: MessageAutomationService,
    private readonly externalApiConfigService: ExternalApiConfigService,
    private readonly businessInfoService: BusinessInfoService,
    private readonly patientAccessService: PatientAccessService,
  ) {}

  async processResourceOperation(
    request: ResourceOperationRequest,
  ): Promise<StandardResponse> {
    const requestId = uuidv4();

    // Validate request
    this.validateRequest(request);

    // NOTE: Permission checks are performed in the controller before calling this method
    // using checkPermissionFromMedic which queries the medic -> role -> permissions flow
    // No need to check permissions here again

    // Create operation for stream
    const operation: ResourceOperation = {
      operation: request.operation,
      businessId: request.businessId,
      locationId: request.locationId,
      resourceType: request.resourceType,
      resourceId: request.resourceId,
      data: request.data, // Include data in the operation - startDate and endDate will be extracted from this
      timestamp: new Date().toISOString(),
      requestId,
    };

    // Send to Kinesis stream
    await this.kinesisService.sendResourceOperation(operation);

    // Send automated messages for appointment creation
    if (request.operation === 'create' && request.resourceType === 'appointment' && request.data) {
      await this.sendAutomatedMessages(request.businessId, request.locationId, request.data);
    }

    // Send rating request email when appointment is marked as completed
    if (
      (request.operation === 'update' || request.operation === 'patch') &&
      request.resourceType === 'appointment' &&
      request.data &&
      request.data.status === 'completed'
    ) {
      await this.sendRatingRequest(request.businessId, request.locationId, request.data);
    }

    return {
      success: true,
      message: `${request.operation} operation queued for processing`,
      requestId,
      timestamp: operation.timestamp,
    };
  }

  private validateRequest(request: ResourceOperationRequest): void {
    if (!request.businessId || !request.locationId) {
      throw new BadRequestException('Business ID and Location ID are required');
    }

    // Resource type is required for create, update, patch, and delete operations
    if (
      ['create', 'update', 'patch', 'delete'].includes(request.operation) &&
      !request.resourceType
    ) {
      throw new BadRequestException(
        'Resource type is required for create, update, patch, and delete operations',
      );
    }

    if (
      request.resourceType &&
      !VALID_RESOURCE_TYPES.includes(request.resourceType)
    ) {
      throw new BadRequestException(
        `Invalid resource type: ${request.resourceType}`,
      );
    }

    // Resource ID is required for update, patch, and delete operations
    if (
      ['update', 'patch', 'delete'].includes(request.operation) &&
      !request.resourceId
    ) {
      throw new BadRequestException(
        'Resource ID is required for update, patch, and delete operations',
      );
    }

    // Validate data is provided for create, update, and patch operations
    if (['create', 'update', 'patch'].includes(request.operation)) {
      if (!request.data) {
        throw new BadRequestException(
          'Data is required for create, update, and patch operations',
        );
      }
    }
  }

  private async sendAutomatedMessages(
    businessId: string,
    locationId: string,
    appointmentData: any
  ): Promise<void> {
    try {
      // Check if any automation services are enabled
      const isAnyServiceEnabled = await this.externalApiConfigService.isAnyServiceEnabled(businessId, locationId);
      
      if (!isAnyServiceEnabled) {
        this.logger.debug(`No automation services enabled for business ${businessId}, location ${locationId}`);
        return;
      }

      // Check what services should send on booking
      const shouldSend = await this.externalApiConfigService.shouldSendOnBooking(businessId, locationId);
      
      if (!shouldSend.sms && !shouldSend.email) {
        this.logger.debug(`No services configured to send on booking for business ${businessId}, location ${locationId}`);
        return;
      }

      // Populate business and location info
      const enrichedAppointmentData = await this.enrichAppointmentData(businessId, locationId, appointmentData);

      // Send booking confirmation
      const success = await this.messageAutomationService.sendBookingConfirmation(
        businessId,
        enrichedAppointmentData,
        locationId
      );

      if (success) {
        this.logger.log(`Booking confirmation sent successfully for business ${businessId}, location ${locationId}`);
      } else {
        this.logger.warn(`Failed to send booking confirmation for business ${businessId}, location ${locationId}`);
      }

    } catch (error) {
      this.logger.error(`Failed to send automated messages: ${error.message}`);
      // Don't throw error to avoid affecting appointment creation
    }
  }

  private async enrichAppointmentData(
    businessId: string,
    locationId: string,
    appointmentData: any
  ): Promise<AppointmentData> {
    try {
      // Get business info
      const businessInfo = await this.businessInfoService.getBusinessInfo(businessId);
      const locationInfo = await this.businessInfoService.getLocationInfo(businessId, locationId);

      // Extract appointment data from the resource data
      const patientName = appointmentData?.patient?.name || appointmentData?.customer?.name || 'Unknown Patient';
      const patientPhone = appointmentData?.patient?.phone || appointmentData?.customer?.phone;
      const patientEmail = appointmentData?.patient?.email || appointmentData?.customer?.email;
      const appointmentDate = this.formatDate(appointmentData?.date || appointmentData?.startDate);
      const appointmentTime = appointmentData?.time;
      const serviceName = appointmentData?.service?.name || 'Service';
      const doctorName = appointmentData?.medic?.name || appointmentData?.doctor?.name || 'Unknown Doctor';
      const patientId = appointmentData?.patient?.id;
      const appointmentId = appointmentData?.resourceId;

      // Generate access code and patient URL if patientId is available
      let accessCode = '';
      let patientUrl = '';
      const domainLabel = (businessInfo as any)?.domainLabel;
      
      if (patientId && domainLabel && locationInfo?.name) {
        accessCode = this.patientAccessService.generateAccessCode(patientId, appointmentId);
        patientUrl = this.patientAccessService.generatePatientUrl(
          domainLabel,
          locationInfo.name,
          patientId
        );
        
        this.logger.log(`Generated access code for patient ${patientId}: ${accessCode}`);
        this.logger.log(`Generated patient URL: ${patientUrl}`);
      } else {
        this.logger.warn(`Cannot generate access code - Missing: patientId=${!!patientId}, domainLabel=${!!domainLabel}, locationName=${!!locationInfo?.name}`);
      }

      return {
        appointmentId,
        patientId,
        patientName,
        patientPhone,
        patientEmail,
        appointmentDate,
        appointmentTime,
        businessName: businessInfo?.businessName || 'Business',
        locationName: locationInfo?.name || 'Location',
        serviceName,
        doctorName,
        phoneNumber: (businessInfo as any)?.phoneNumber || '',
        domainLabel: (businessInfo as any)?.domainLabel,
        accessCode,
        patientUrl
      };
    } catch (error) {
      this.logger.error(`Failed to enrich appointment data: ${error.message}`);
      return {
        patientName: 'Unknown Patient',
        patientPhone: '',
        patientEmail: '',
        appointmentDate: '',
        appointmentTime: '',
        businessName: 'Business',
        locationName: 'Location',
        serviceName: 'Service',
        doctorName: 'Unknown Doctor',
        phoneNumber: ''
      };
    }
  }

  private formatDate(date: string): string {
    const d = new Date(date + 'T00:00:00Z');
    return d.toLocaleDateString('ro-RO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  private async sendRatingRequest(
    businessId: string,
    locationId: string,
    appointmentData: any
  ): Promise<void> {
    try {
      // Check if rating is enabled
      const config = await this.externalApiConfigService.getConfig(businessId, locationId);
      
      if (!config || !config.rating?.enabled || !config.rating?.sendOnCompletion) {
        this.logger.debug(`Rating system is disabled for business ${businessId}, location ${locationId}`);
        return;
      }

      // Extract appointment data
      const patientName = appointmentData?.patient?.name || appointmentData?.customer?.name;
      const patientEmail = appointmentData?.patient?.email || appointmentData?.customer?.email;
      const appointmentId = appointmentData?.id || appointmentData?.resourceId;
      const patientId = appointmentData?.patient?.id;
      const appointmentDate = this.formatDate(appointmentData?.date || appointmentData?.startDate);
      const appointmentTime = appointmentData?.time;

      if (!patientEmail) {
        this.logger.warn(`Cannot send rating request - no patient email for appointment ${appointmentId}`);
        return;
      }

      // Get business info for location name
      const businessInfo = await this.businessInfoService.getBusinessInfo(businessId);
      const locationInfo = await this.businessInfoService.getLocationInfo(businessId, locationId);

      // Call ai-agent-server to send rating email and get token
      const aiAgentUrl = process.env.AI_AGENT_SERVER_URL || 'http://localhost:3002';
      const response = await fetch(`${aiAgentUrl}/rating/send-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessId,
          locationId,
          appointmentId,
          patientId,
          patientName,
          patientEmail,
          appointmentDate,
          appointmentTime,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success && result.token) {
        this.logger.log(`Rating request email sent successfully for appointment ${appointmentId}`);

        // Create rating resource with token
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30); // 30 days expiration

        const ratingResourceData = {
          token: result.token,
          tokenUsed: false,
          tokenExpiresAt: expiresAt.toISOString(),
          appointmentId,
          patientId,
          patientName,
          patientEmail,
          appointmentDate,
          appointmentTime,
          locationName: locationInfo?.name || '',
          businessName: businessInfo?.businessName || '',
          score: 0, // Not yet rated
          createdAt: new Date().toISOString(),
        };

        // Send create operation to Kinesis for rating resource
        const operation: ResourceOperation = {
          operation: 'create',
          businessId,
          locationId,
          resourceType: 'rating',
          data: ratingResourceData,
          timestamp: new Date().toISOString(),
          requestId: uuidv4(),
        };

        await this.kinesisService.sendResourceOperation(operation);
        this.logger.log(`Rating resource created with token for appointment ${appointmentId}`);
      } else {
        this.logger.warn(`Failed to send rating request: ${result.error}`);
      }

    } catch (error) {
      this.logger.error(`Failed to send rating request: ${error.message}`);
      // Don't throw error to avoid affecting appointment update
    }
  }
}
