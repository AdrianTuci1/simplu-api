import { RagInstruction } from '../rag.service';

export const initialInstructions: RagInstruction[] = [
  // Instrucțiuni pentru rezervări dentale
  {
    instructionId: 'dental-reservation-001',
    businessType: 'dental',
    category: 'rezervare',
    instruction: 'Procesează o cerere de rezervare pentru cabinetul dental',
    workflow: [
      {
        step: 1,
        action: 'extract_reservation_details',
        description: 'Extrage data, ora și serviciul din mesaj',
        validation: 'has_date_and_service'
      },
      {
        step: 2,
        action: 'check_availability',
        description: 'Verifică disponibilitatea în sistem',
        apiCall: {
          method: 'GET',
          endpoint: '/resources/{businessId}/{locationId}/availability',
          dataTemplate: '{"date": "{date}", "serviceId": "{serviceId}"}'
        }
      },
      {
        step: 3,
        action: 'create_reservation',
        description: 'Creează rezervarea în sistem',
        apiCall: {
          method: 'POST',
          endpoint: '/resources/{businessId}/{locationId}/reservations',
          dataTemplate: '{"customerId": "{customerId}", "serviceId": "{serviceId}", "date": "{date}", "time": "{time}"}'
        },
        validation: 'reservation_created'
      },
      {
        step: 4,
        action: 'send_confirmation',
        description: 'Trimite confirmare prin canalul original',
        validation: 'confirmation_sent'
      }
    ],
    requiredPermissions: ['reservations:create', 'customers:read'],
    apiEndpoints: ['/reservations', '/availability', '/customers'],
    successCriteria: ['reservation_created', 'confirmation_sent'],
    notificationTemplate: 'Am preluat o rezervare în data de {data} pentru {utilizatorul} în urma unei conversații pe {source}',
    isActive: true,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
    metadata: {
      examples: [
        'Vreau să fac o programare pentru mâine',
        'Pot să rezerv o consultație pentru săptămâna viitoare?',
        'Am nevoie de o programare urgentă'
      ],
      keywords: ['rezervare', 'programare', 'consultație', 'programează', 'mâine'],
      confidence: 0.95
    }
  },

  // Instrucțiuni pentru servicii dentale
  {
    instructionId: 'dental-services-001',
    businessType: 'dental',
    category: 'servicii',
    instruction: 'Informează despre serviciile disponibile în cabinetul dental',
    workflow: [
      {
        step: 1,
        action: 'get_services',
        description: 'Obține lista serviciilor disponibile',
        apiCall: {
          method: 'GET',
          endpoint: '/resources/{businessId}/{locationId}/services',
          dataTemplate: '{}'
        }
      },
      {
        step: 2,
        action: 'format_services_response',
        description: 'Formatează răspunsul cu serviciile disponibile',
        validation: 'services_formatted'
      }
    ],
    requiredPermissions: ['services:read'],
    apiEndpoints: ['/services'],
    successCriteria: ['services_retrieved'],
    notificationTemplate: 'Am furnizat informații despre serviciile disponibile pentru {utilizatorul}',
    isActive: true,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
    metadata: {
      examples: [
        'Ce servicii oferiți?',
        'Care sunt prețurile pentru consultații?',
        'Vreau să știu despre tratamentele disponibile'
      ],
      keywords: ['servicii', 'prețuri', 'tratamente', 'consultații', 'ofere'],
      confidence: 0.90
    }
  },

  // Instrucțiuni pentru sală de fitness
  {
    instructionId: 'gym-membership-001',
    businessType: 'gym',
    category: 'membrii',
    instruction: 'Gestionează cereri pentru abonamente la sală',
    workflow: [
      {
        step: 1,
        action: 'extract_membership_request',
        description: 'Extrage detalii despre cererea de abonament',
        validation: 'has_membership_details'
      },
      {
        step: 2,
        action: 'check_membership_availability',
        description: 'Verifică disponibilitatea abonamentelor',
        apiCall: {
          method: 'GET',
          endpoint: '/resources/{businessId}/{locationId}/memberships',
          dataTemplate: '{"type": "{membershipType}"}'
        }
      },
      {
        step: 3,
        action: 'create_membership_request',
        description: 'Creează cererea de abonament',
        apiCall: {
          method: 'POST',
          endpoint: '/resources/{businessId}/{locationId}/membership-requests',
          dataTemplate: '{"customerId": "{customerId}", "membershipType": "{membershipType}", "startDate": "{startDate}"}'
        }
      }
    ],
    requiredPermissions: ['memberships:read', 'membership-requests:create'],
    apiEndpoints: ['/memberships', '/membership-requests'],
    successCriteria: ['membership_request_created'],
    notificationTemplate: 'Am procesat o cerere de abonament pentru {utilizatorul}',
    isActive: true,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
    metadata: {
      examples: [
        'Vreau să mă abonez la sală',
        'Care sunt tipurile de abonamente?',
        'Pot să fac un abonament pentru 3 luni?'
      ],
      keywords: ['abonament', 'sală', 'fitness', 'membru', 'înscriere'],
      confidence: 0.92
    }
  },

  // Instrucțiuni pentru hotel
  {
    instructionId: 'hotel-booking-001',
    businessType: 'hotel',
    category: 'rezervare',
    instruction: 'Procesează rezervări pentru camere de hotel',
    workflow: [
      {
        step: 1,
        action: 'extract_booking_details',
        description: 'Extrage detalii despre rezervare (data check-in, check-out, tip cameră)',
        validation: 'has_booking_details'
      },
      {
        step: 2,
        action: 'check_room_availability',
        description: 'Verifică disponibilitatea camerelor',
        apiCall: {
          method: 'GET',
          endpoint: '/resources/{businessId}/{locationId}/rooms/availability',
          dataTemplate: '{"checkIn": "{checkIn}", "checkOut": "{checkOut}", "roomType": "{roomType}"}'
        }
      },
      {
        step: 3,
        action: 'create_booking',
        description: 'Creează rezervarea',
        apiCall: {
          method: 'POST',
          endpoint: '/resources/{businessId}/{locationId}/bookings',
          dataTemplate: '{"customerId": "{customerId}", "roomId": "{roomId}", "checkIn": "{checkIn}", "checkOut": "{checkOut}"}'
        }
      }
    ],
    requiredPermissions: ['bookings:create', 'rooms:read'],
    apiEndpoints: ['/rooms', '/bookings'],
    successCriteria: ['booking_created'],
    notificationTemplate: 'Am procesat o rezervare de cameră pentru {utilizatorul}',
    isActive: true,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
    metadata: {
      examples: [
        'Vreau să rezerv o cameră pentru weekend',
        'Aveți camere disponibile pentru 2 persoane?',
        'Pot să fac o rezervare pentru săptămâna viitoare?'
      ],
      keywords: ['rezervare', 'cameră', 'hotel', 'check-in', 'check-out'],
      confidence: 0.94
    }
  }
]; 