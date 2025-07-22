# Management Server

A NestJS-based management server for creating and managing business tenants with automated infrastructure provisioning, payment processing, and lifecycle management.

## Features

- **Business Creation**: Create businesses with multiple locations and business types (dental, gym, hotel)
- **Payment Processing**: Integrated Stripe payment processing with subscription management
- **Infrastructure Automation**: Automated CloudFormation stack creation for React applications
- **Domain Management**: Support for custom domains and subdomain generation
- **Payment Monitoring**: Automated monitoring of payment status with business lifecycle management
- **Data Persistence**: DynamoDB-based data storage with comprehensive business entity management

## Architecture

The management server is built with a modular architecture:

- **Business Module**: Core business logic and CRUD operations
- **Payment Module**: Stripe integration for payment processing
- **Infrastructure Module**: AWS CloudFormation and domain management
- **Database Module**: DynamoDB operations and data persistence
- **Scheduler Module**: Automated payment monitoring and cleanup tasks

## Prerequisites

- Node.js 18+ 
- AWS Account with appropriate permissions
- Stripe Account with configured products and prices
- DynamoDB table for business data

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy the environment configuration:
   ```bash
   cp env.example .env
   ```

4. Configure your environment variables in `.env`

## Configuration

### Environment Variables

- `PORT`: Server port (default: 3001)
- `AWS_REGION`: AWS region for services
- `AWS_ACCESS_KEY_ID`: AWS access key
- `AWS_SECRET_ACCESS_KEY`: AWS secret key
- `DYNAMODB_TABLE_NAME`: DynamoDB table name
- `STRIPE_SECRET_KEY`: Stripe secret key
- `STRIPE_DENTAL_PRICE_ID`: Stripe price ID for dental businesses
- `STRIPE_GYM_PRICE_ID`: Stripe price ID for gym businesses
- `STRIPE_HOTEL_PRICE_ID`: Stripe price ID for hotel businesses
- `BASE_DOMAIN`: Base domain for subdomain generation

## Running the Application

### Development
```bash
npm run start:dev
```

### Production
```bash
npm run build
npm run start:prod
```

## API Documentation

Once the server is running, visit `http://localhost:3001/api` for Swagger documentation.

### Key Endpoints

#### Business Management
- `POST /businesses` - Create a new business
- `GET /businesses` - Get all businesses
- `GET /businesses/:id` - Get a specific business
- `PUT /businesses/:id` - Update a business
- `DELETE /businesses/:id` - Delete a business
- `GET /businesses/status/:status` - Get businesses by status
- `GET /businesses/payment-status/:paymentStatus` - Get businesses by payment status

#### Payment Management
- `POST /payments/webhook` - Stripe webhook handler
- `GET /payments/subscription/:id` - Get subscription details
- `POST /payments/subscription/:id/cancel` - Cancel subscription

#### Infrastructure Management
- `POST /infrastructure/react-app` - Create React app infrastructure
- `DELETE /infrastructure/react-app/:stackName` - Delete React app infrastructure
- `POST /infrastructure/domain` - Create custom domain
- `POST /infrastructure/dns` - Setup domain DNS

## Business Creation Flow

1. **Request Validation**: Validate business creation request
2. **Stripe Customer Creation**: Create Stripe customer for payment processing
3. **Subscription Setup**: Create Stripe subscription with appropriate pricing
4. **Infrastructure Provisioning**: Create CloudFormation stack for React application
5. **Domain Setup**: Configure custom domain or generate subdomain
6. **Data Persistence**: Save business data to DynamoDB
7. **Response**: Return business details with infrastructure information

## Payment Monitoring

The system includes automated payment monitoring:

- **Daily Monitoring**: Checks for past due and unpaid businesses
- **Weekly Cleanup**: Removes businesses that have been unpaid for 30+ days
- **Status Updates**: Automatically updates business status based on payment status

## Business Lifecycle

1. **Active**: Business is created and payment is current
2. **Suspended**: Payment is past due or unpaid
3. **Deleted**: Business is removed after extended non-payment

## Data Models

### Business Entity
- Company information (name, registration number)
- Business type (dental, gym, hotel)
- Multiple locations with contact information
- Settings (timezone, currency, language, features)
- Permissions (roles, modules)
- Payment information (Stripe customer/subscription IDs)
- Infrastructure information (CloudFormation stack, app URL)
- Status and timestamps

### Location Information
- Location ID, name, address
- Contact information (phone, email)
- Active status and timestamps

## Error Handling

The application includes comprehensive error handling:
- Input validation using class-validator
- Database operation error handling
- Payment processing error handling
- Infrastructure provisioning error handling
- Graceful degradation for failed operations

## Security

- Input validation and sanitization
- Environment-based configuration
- Secure AWS credential management
- Stripe webhook signature verification (to be implemented)

## Monitoring and Logging

- Structured logging with Winston
- Error tracking and monitoring
- Performance metrics collection
- Health check endpoints

## Deployment

### Docker
```bash
docker build -t management-server .
docker run -p 3001:3001 management-server
```

### AWS Deployment
- Deploy to AWS ECS/Fargate
- Use AWS Secrets Manager for sensitive configuration
- Configure auto-scaling based on load
- Set up CloudWatch monitoring and alerting

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

This project is licensed under the MIT License. 