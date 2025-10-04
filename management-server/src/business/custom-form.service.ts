import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

export interface CustomFormConfig {
  businessId: string;
  domainLabel: string;
  businessType: string;
  formFields: FormField[];
  styling: FormStyling;
  validation: FormValidation;
}

export interface FormField {
  id: string;
  type: 'text' | 'email' | 'phone' | 'date' | 'select' | 'textarea' | 'checkbox';
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[]; // For select fields
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
}

export interface FormStyling {
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  borderRadius: string;
  buttonStyle: 'rounded' | 'square' | 'pill';
}

export interface FormValidation {
  requiredFields: string[];
  customRules: CustomRule[];
}

export interface CustomRule {
  fieldId: string;
  rule: string;
  message: string;
}

@Injectable()
export class CustomFormService {
  private readonly logger = new Logger(CustomFormService.name);
  private readonly s3Client: S3Client;

  constructor(private readonly configService: ConfigService) {
    this.s3Client = new S3Client({
      region: this.configService.get('AWS_REGION', 'us-east-1'),
      credentials: {
        accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
      },
    });
  }

  /**
   * Load custom form configuration from S3 bucket for a business
   */
  async loadCustomFormFromS3(
    businessId: string,
    domainLabel: string,
    businessType: string,
  ): Promise<CustomFormConfig> {
    try {
      this.logger.log(`Loading custom form from S3 for business ${businessId} with domain ${domainLabel}`);

      const bucketName = `business-client-${businessId}-${domainLabel}`;
      
      // Try to load form configuration from business-specific bucket first
      try {
        const formConfig = await this.loadFormConfigFromBucket(bucketName, 'form-config.json');
        this.logger.log(`Loaded custom form configuration from business bucket for ${businessId}`);
        return formConfig;
      } catch (error) {
        this.logger.warn(`Could not load form config from business bucket, falling back to businessType bucket: ${error.message}`);
      }

      // Fallback to businessType bucket if business-specific config doesn't exist
      const businessTypeBucketName = `business-forms-${businessType}`;
      const formConfig = await this.loadFormConfigFromBucket(businessTypeBucketName, 'form-config.json');
      
      // Customize the form config with business-specific details
      formConfig.businessId = businessId;
      formConfig.domainLabel = domainLabel;
      formConfig.styling = this.generateCustomStyling(domainLabel);

      this.logger.log(`Loaded custom form configuration from businessType bucket for ${businessId}`);
      return formConfig;
    } catch (error) {
      this.logger.error(`Error loading custom form from S3 for business ${businessId}:`, error);
      throw error;
    }
  }

  /**
   * Load form configuration from S3 bucket
   */
  private async loadFormConfigFromBucket(bucketName: string, key: string): Promise<CustomFormConfig> {
    try {
      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
      });

      const response = await this.s3Client.send(command);
      
      if (!response.Body) {
        throw new Error('Empty response body');
      }

      const bodyContent = await response.Body.transformToString();
      const formConfig = JSON.parse(bodyContent) as CustomFormConfig;
      
      return formConfig;
    } catch (error) {
      this.logger.error(`Error loading form config from bucket ${bucketName}/${key}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get form fields based on business type
   */
  private getBusinessTypeFormFields(businessType: string): FormField[] {
    const baseFields: FormField[] = [
      {
        id: 'name',
        type: 'text',
        label: 'Nume complet',
        placeholder: 'Introduceți numele complet',
        required: true,
        validation: {
          minLength: 2,
          maxLength: 100,
        },
      },
      {
        id: 'email',
        type: 'email',
        label: 'Adresa de email',
        placeholder: 'exemplu@email.com',
        required: true,
        validation: {
          pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
        },
      },
      {
        id: 'phone',
        type: 'phone',
        label: 'Număr de telefon',
        placeholder: '+40 123 456 789',
        required: true,
        validation: {
          pattern: '^\\+40[0-9]{9}$',
        },
      },
    ];

    // Add business-specific fields
    switch (businessType) {
      case 'dental':
        return [
          ...baseFields,
          {
            id: 'appointment_type',
            type: 'select',
            label: 'Tipul programării',
            required: true,
            options: ['Consult', 'Tratament', 'Urgență', 'Control'],
          },
          {
            id: 'preferred_date',
            type: 'date',
            label: 'Data preferată',
            required: true,
          },
          {
            id: 'preferred_time',
            type: 'select',
            label: 'Ora preferată',
            required: true,
            options: ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'],
          },
          {
            id: 'notes',
            type: 'textarea',
            label: 'Observații',
            placeholder: 'Descrieți problema sau cerința dumneavoastră...',
            required: false,
          },
        ];
      
      case 'gym':
        return [
          ...baseFields,
          {
            id: 'membership_type',
            type: 'select',
            label: 'Tipul abonamentului',
            required: true,
            options: ['Lunar', 'Trimestrial', 'Anual', 'Trial'],
          },
          {
            id: 'preferred_start_date',
            type: 'date',
            label: 'Data de început preferată',
            required: true,
          },
          {
            id: 'fitness_goals',
            type: 'textarea',
            label: 'Obiectivele fitness',
            placeholder: 'Descrieți obiectivele dumneavoastră...',
            required: false,
          },
        ];
      
      case 'hotel':
        return [
          ...baseFields,
          {
            id: 'check_in',
            type: 'date',
            label: 'Data check-in',
            required: true,
          },
          {
            id: 'check_out',
            type: 'date',
            label: 'Data check-out',
            required: true,
          },
          {
            id: 'guests',
            type: 'select',
            label: 'Numărul de oaspeți',
            required: true,
            options: ['1', '2', '3', '4', '5+'],
          },
          {
            id: 'special_requests',
            type: 'textarea',
            label: 'Cerințe speciale',
            placeholder: 'Aveți cerințe speciale pentru cazare?',
            required: false,
          },
        ];
      
      default:
        return baseFields;
    }
  }

  /**
   * Generate custom styling based on domainLabel
   */
  private generateCustomStyling(domainLabel: string): FormStyling {
    // Generate colors based on domainLabel hash
    const hash = this.hashString(domainLabel);
    const primaryColor = this.generateColorFromHash(hash, 0);
    const secondaryColor = this.generateColorFromHash(hash, 1);

    return {
      primaryColor,
      secondaryColor,
      fontFamily: 'Inter, system-ui, sans-serif',
      borderRadius: '8px',
      buttonStyle: 'rounded',
    };
  }

  /**
   * Generate validation rules for form fields
   */
  private generateValidationRules(formFields: FormField[]): FormValidation {
    const requiredFields = formFields
      .filter(field => field.required)
      .map(field => field.id);

    const customRules: CustomRule[] = [
      {
        fieldId: 'email',
        rule: 'email',
        message: 'Vă rugăm să introduceți o adresă de email validă',
      },
      {
        fieldId: 'phone',
        rule: 'phone',
        message: 'Vă rugăm să introduceți un număr de telefon valid',
      },
    ];

    return {
      requiredFields,
      customRules,
    };
  }

  /**
   * Store form configuration (placeholder implementation)
   */
  private async storeFormConfiguration(config: CustomFormConfig): Promise<void> {
    // TODO: Implement actual storage in database
    this.logger.log(`Form configuration stored for business ${config.businessId}`);
  }

  /**
   * Load HTML form from S3 bucket or generate from configuration
   */
  async loadFormHTMLFromS3(businessId: string, domainLabel: string, businessType: string): Promise<string> {
    try {
      const bucketName = `business-client-${businessId}-${domainLabel}`;
      
      // Try to load HTML form from business-specific bucket first
      try {
        const htmlContent = await this.loadHTMLFromBucket(bucketName, 'index.html');
        this.logger.log(`Loaded HTML form from business bucket for ${businessId}`);
        return htmlContent;
      } catch (error) {
        this.logger.warn(`Could not load HTML form from business bucket, falling back to businessType bucket: ${error.message}`);
      }

      // Fallback to businessType bucket if business-specific HTML doesn't exist
      const businessTypeBucketName = `business-forms-${businessType}`;
      const htmlContent = await this.loadHTMLFromBucket(businessTypeBucketName, 'index.html');
      
      this.logger.log(`Loaded HTML form from businessType bucket for ${businessId}`);
      return htmlContent;
    } catch (error) {
      this.logger.error(`Error loading HTML form from S3 for business ${businessId}:`, error);
      
      // Final fallback: generate HTML from configuration
      this.logger.log(`Falling back to generating HTML from configuration for business ${businessId}`);
      const config = await this.loadCustomFormFromS3(businessId, domainLabel, businessType);
      return this.generateFormHTMLFromConfig(config);
    }
  }

  /**
   * Load HTML content from S3 bucket
   */
  private async loadHTMLFromBucket(bucketName: string, key: string): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
      });

      const response = await this.s3Client.send(command);
      
      if (!response.Body) {
        throw new Error('Empty response body');
      }

      const htmlContent = await response.Body.transformToString();
      return htmlContent;
    } catch (error) {
      this.logger.error(`Error loading HTML from bucket ${bucketName}/${key}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate HTML form from configuration (fallback method)
   */
  private generateFormHTMLFromConfig(config: CustomFormConfig): string {
    const formFieldsHTML = config.formFields.map(field => this.generateFieldHTML(field)).join('\n');
    
    return `
<!DOCTYPE html>
<html lang="ro">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Formular de contact - ${config.domainLabel}</title>
    <style>
        body {
            font-family: ${config.styling.fontFamily};
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .form-container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: ${config.styling.borderRadius};
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .form-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            margin-bottom: 5px;
            font-weight: 500;
            color: #333;
        }
        input, select, textarea {
            width: 100%;
            padding: 12px;
            border: 2px solid #e1e1e1;
            border-radius: ${config.styling.borderRadius};
            font-size: 16px;
            transition: border-color 0.3s;
        }
        input:focus, select:focus, textarea:focus {
            outline: none;
            border-color: ${config.styling.primaryColor};
        }
        .btn {
            background-color: ${config.styling.primaryColor};
            color: white;
            padding: 12px 30px;
            border: none;
            border-radius: ${config.styling.buttonStyle === 'rounded' ? '8px' : config.styling.buttonStyle === 'pill' ? '25px' : '0'};
            font-size: 16px;
            cursor: pointer;
            transition: background-color 0.3s;
        }
        .btn:hover {
            background-color: ${config.styling.secondaryColor};
        }
        .required {
            color: red;
        }
    </style>
</head>
<body>
    <div class="form-container">
        <h1>Formular de contact</h1>
        <form id="contactForm">
            ${formFieldsHTML}
            <button type="submit" class="btn">Trimite cererea</button>
        </form>
    </div>
    <script>
        document.getElementById('contactForm').addEventListener('submit', function(e) {
            e.preventDefault();
            alert('Cererea a fost trimisă cu succes!');
        });
    </script>
</body>
</html>`;
  }

  /**
   * Generate HTML for a single form field
   */
  private generateFieldHTML(field: FormField): string {
    const required = field.required ? 'required' : '';
    const requiredStar = field.required ? '<span class="required">*</span>' : '';
    
    let inputHTML = '';
    
    switch (field.type) {
      case 'textarea':
        inputHTML = `<textarea name="${field.id}" ${required} placeholder="${field.placeholder || ''}"></textarea>`;
        break;
      case 'select':
        const options = field.options?.map(option => `<option value="${option}">${option}</option>`).join('') || '';
        inputHTML = `<select name="${field.id}" ${required}><option value="">Selectați...</option>${options}</select>`;
        break;
      case 'checkbox':
        inputHTML = `<input type="checkbox" name="${field.id}" ${required}>`;
        break;
      default:
        inputHTML = `<input type="${field.type}" name="${field.id}" ${required} placeholder="${field.placeholder || ''}">`;
    }
    
    return `
      <div class="form-group">
        <label for="${field.id}">${field.label} ${requiredStar}</label>
        ${inputHTML}
      </div>`;
  }

  /**
   * Hash a string to generate consistent colors
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Generate a color from hash with offset
   */
  private generateColorFromHash(hash: number, offset: number): string {
    const hue = (hash + offset * 137.5) % 360;
    const saturation = 70 + (hash % 30);
    const lightness = 50 + (hash % 20);
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  }
}
