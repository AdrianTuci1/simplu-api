import { Injectable, Logger } from '@nestjs/common';

/**
 * Service for validating patient access codes
 * Uses the same algorithm as in ai-agent-server to generate deterministic codes
 */
@Injectable()
export class PatientAccessService {
  private readonly logger = new Logger(PatientAccessService.name);

  /**
   * Generate access code for patient (same algorithm as ai-agent-server)
   * Simple 6-digit code based on patientId and appointmentId
   */
  generateAccessCode(patientId: string, appointmentId?: string): string {
    const input = appointmentId ? `${patientId}:${appointmentId}` : patientId;
    
    // Generate a simple 6-digit numeric code
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    // Convert to 6-digit positive number
    const code = Math.abs(hash) % 1000000;
    return code.toString().padStart(6, '0');
  }

  /**
   * Validate access code against patientId
   * Returns true if the code matches the generated code for that patient
   */
  validateAccessCode(patientId: string, accessCode: string, appointmentId?: string): boolean {
    const expectedCode = this.generateAccessCode(patientId, appointmentId);
    const isValid = expectedCode === accessCode;
    
    this.logger.log(
      `Access code validation for patient ${patientId}: ${isValid ? '✅ VALID' : '❌ INVALID'}`
    );
    
    return isValid;
  }

  /**
   * Extract patientId from URL query parameter
   * URL format: ?patient{patientId} or ?patientId={patientId}
   */
  extractPatientIdFromQuery(query: string): string | null {
    // Handle format: ?patient{patientId}
    if (query.startsWith('patient')) {
      return query.substring('patient'.length);
    }
    
    // Handle format: ?patientId={patientId}
    return query;
  }

  /**
   * Format location name for URL (replace spaces with hyphens, lowercase)
   */
  private formatLocationForUrl(locationName: string): string {
    return locationName
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .replace(/\s+/g, '-')           // Replace spaces with hyphens
      .replace(/[^\w\-]/g, '')        // Remove special chars except hyphens
      .replace(/\-+/g, '-')           // Replace multiple hyphens with single
      .replace(/^\-|\-$/g, '');       // Remove leading/trailing hyphens
  }

  /**
   * Generate patient URL with patientId
   */
  generatePatientUrl(
    domainLabel: string,
    locationName: string,
    patientId: string,
    baseDomain: string = 'simplu.io'
  ): string {
    const formattedLocation = this.formatLocationForUrl(locationName);
    return `https://${domainLabel}.${baseDomain}/${formattedLocation}/details?${patientId}`;
  }
}

