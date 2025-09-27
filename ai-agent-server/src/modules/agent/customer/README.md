# Customer Agent Architecture

The Customer Agent is a specialized AI agent designed to help customers with booking appointments, finding services, and getting information about treatments. It can interrogate the app server for patient-booking and business-info, and directly query the database for treatments.

## Architecture Overview

### Flow: Start → App Server Data → Database Query → Booking Guidance → Response

The customer agent follows a specialized flow optimized for customer assistance:

1. **Start Flow**: Loads dynamic memory and system instructions
2. **App Server Data Flow**: Interrogates the app server for services, available dates, and business info
3. **Database Query Flow**: Queries the database for treatments through the resource query service
4. **Booking Guidance Flow**: Provides intelligent booking guidance based on available data
5. **Response Flow**: Generates friendly, helpful responses for customers

## Components

### Core Nodes (`nodes/`)

#### `app-server-data.node.ts`
- **Purpose**: Interrogates the app server for patient-booking and business-info
- **Capabilities**:
  - Get public services available for booking
  - Get available dates with free slots
  - Get specific time slots for dates
  - Get business and location information
- **Data Sources**: App server APIs for patient-booking and business-info

#### `database-query.node.ts`
- **Purpose**: Queries the database for treatments through the resource query service
- **Capabilities**:
  - Query treatments by category, price, duration
  - Filter active treatments
  - Get treatment details and descriptions
- **Data Source**: Database through ResourceQueryService

#### `booking-guidance.node.ts`
- **Purpose**: Provides intelligent booking guidance based on available data
- **Capabilities**:
  - Analyze available services and dates
  - Recommend suitable treatments
  - Suggest optimal booking times
  - Provide step-by-step booking instructions
- **Features**:
  - Real-time availability checking
  - Intelligent recommendations
  - Booking process guidance

### Clients (`clients/`)

#### `app-server.client.ts`
- **Purpose**: HTTP client for communicating with the app server
- **Key Methods**:
  - `getPublicServices()`: Get services available for booking
  - `getAvailableDates()`: Get available dates with free slots
  - `getTimeSlots()`: Get specific time slots for a date
  - `getBusinessInfo()`: Get business information
  - `getLocationInfo()`: Get location information
  - `createBooking()`: Create a booking (if authorized)
  - `checkSlotAvailability()`: Check if a time slot is available

## Key Features

### App Server Integration
- **Service Discovery**: Automatically discovers available services
- **Real-time Availability**: Gets current available dates and time slots
- **Business Information**: Retrieves business and location details
- **Booking Capabilities**: Can create bookings when authorized

### Database Integration
- **Treatment Queries**: Direct database access for treatment information
- **Flexible Filtering**: Query treatments by various criteria
- **Real-time Data**: Always gets the latest treatment information

### Intelligent Guidance
- **Smart Recommendations**: Suggests suitable treatments based on customer needs
- **Availability Analysis**: Analyzes available slots and suggests optimal times
- **Step-by-step Guidance**: Provides clear instructions for booking process

### Customer-Friendly Responses
- **Friendly Tone**: Warm, helpful communication style
- **Actionable Information**: Provides specific, useful information
- **Clear Actions**: Offers clear next steps for customers

## Usage Examples

### Service Discovery
```typescript
// Customer asks: "What services do you offer?"
// Agent queries app server for public services
// Returns list of available services with descriptions and prices
```

### Treatment Information
```typescript
// Customer asks: "What dental treatments are available?"
// Agent queries database for treatments
// Returns detailed treatment information with descriptions
```

### Booking Guidance
```typescript
// Customer asks: "I want to book a cleaning appointment"
// Agent gets available dates and time slots
// Provides step-by-step booking guidance
// Suggests optimal appointment times
```

### Real-time Availability
```typescript
// Customer asks: "When can I book an appointment?"
// Agent checks real-time availability
// Returns available dates and time slots
// Provides booking instructions
```

## Data Flow

1. **Customer Message** → Agent receives customer inquiry
2. **App Server Query** → Agent queries app server for services and availability
3. **Database Query** → Agent queries database for treatment details
4. **Data Analysis** → Agent analyzes available data and customer needs
5. **Guidance Generation** → Agent generates booking guidance and recommendations
6. **Response Generation** → Agent creates friendly, helpful response
7. **Action Suggestions** → Agent provides actionable next steps

## Benefits

1. **Comprehensive Information**: Combines app server and database data for complete picture
2. **Real-time Availability**: Always provides current booking availability
3. **Intelligent Guidance**: Smart recommendations based on customer needs
4. **User-Friendly**: Friendly, helpful communication style
5. **Actionable Responses**: Provides clear next steps for customers
6. **Flexible Integration**: Easy to extend with new data sources

## Configuration

### Environment Variables
- `APP_SERVER_URL`: URL of the app server (default: http://localhost:3001)
- `DATABASE_URL`: Database connection string
- `RESOURCE_QUERY_SERVICE_URL`: Resource query service URL

### Dependencies
- App server for patient-booking and business-info
- Database for treatment information
- Resource query service for database access
- OpenAI for intelligent responses

## Future Enhancements

- **Advanced Booking**: Direct booking creation capabilities
- **Payment Integration**: Integration with payment systems
- **Calendar Integration**: Integration with external calendar systems
- **Multi-language Support**: Support for multiple languages
- **Voice Integration**: Voice-based booking assistance
- **Mobile Optimization**: Optimized for mobile devices
