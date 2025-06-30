# API Request Examples

Această documentație conține exemple complete de request-uri către server, inclusiv structura URL-ului, header-ele și datele trimise.

## Autentificare (fără JWT)

### Login
```javascript
// POST /api/auth
const loginRequest = {
  url: '/api/auth',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Tenant-ID': 'tenant-123'
  },
  data: {
    email: 'user@example.com',
    password: 'password123'
  }
};
```

### Refresh Token
```javascript
// POST /api/auth/refresh
const refreshRequest = {
  url: '/api/auth/refresh',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Tenant-ID': 'tenant-123'
  },
  data: {
    refreshToken: 'refresh-token-here'
  }
};
```

## Informații Business (fără JWT)

### Obține informații business
```javascript
// GET /api/business-info
const businessInfoRequest = {
  url: '/api/business-info',
  method: 'GET',
  headers: {
    'X-Tenant-ID': 'tenant-123'
  }
};
```

## Facturi (cu JWT)

### Obține toate facturile
```javascript
// GET /api/invoices
const getInvoicesRequest = {
  url: '/api/invoices',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    'X-Tenant-ID': 'tenant-123',
    'X-Location-ID': 'location-456'
  },
  params: {
    page: 1,
    limit: 20,
    status: 'pending',
    dateFrom: '2024-01-01',
    dateTo: '2024-12-31'
  }
};
```

### Creează factură nouă
```javascript
// POST /api/invoices
const createInvoiceRequest = {
  url: '/api/invoices',
  method: 'POST',
  headers: {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    'X-Tenant-ID': 'tenant-123',
    'X-Location-ID': 'location-456',
    'Content-Type': 'application/json'
  },
  data: {
    clientId: "client-123",
    items: [
      {
        serviceId: "service-456",
        quantity: 1,
        price: 150.00,
        description: "Consultare stomatologică"
      }
    ],
    totalAmount: 150.00,
    dueDate: "2024-02-15",
    notes: "Factură pentru serviciile din ianuarie"
  }
};
```

## Stocuri (cu JWT)

### Obține toate stocurile
```javascript
// GET /api/stocks
const getStocksRequest = {
  url: '/api/stocks',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    'X-Tenant-ID': 'tenant-123',
    'X-Location-ID': 'location-456'
  },
  params: {
    category: 'dental_supplies',
    lowStock: true,
    search: 'pastă'
  }
};
```

### Adaugă produs în stoc
```javascript
// POST /api/stocks
const addStockRequest = {
  url: '/api/stocks',
  method: 'POST',
  headers: {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    'X-Tenant-ID': 'tenant-123',
    'X-Location-ID': 'location-456',
    'Content-Type': 'application/json'
  },
  data: {
    name: "Pastă de dinți Colgate",
    category: "dental_supplies",
    quantity: 50,
    unit: "buc",
    price: 15.50,
    supplier: "Dental Supplies Ltd",
    minQuantity: 10,
    expiryDate: "2025-12-31"
  }
};
```

## Timeline Business-Specific (cu JWT)

### Dental Timeline
```javascript
// GET /api/dental/timeline
const getDentalTimelineRequest = {
  url: '/api/dental/timeline',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    'X-Tenant-ID': 'tenant-123',
    'X-Location-ID': 'location-456'
  },
  params: {
    date: '2024-01-15',
    doctorId: 'doctor-123',
    status: 'confirmed'
  }
};

// POST /api/dental/timeline
const createDentalAppointmentRequest = {
  url: '/api/dental/timeline',
  method: 'POST',
  headers: {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    'X-Tenant-ID': 'tenant-123',
    'X-Location-ID': 'location-456',
    'Content-Type': 'application/json'
  },
  data: {
    clientId: 'client-123',
    doctorId: 'doctor-456',
    date: '2024-01-20',
    time: '14:30',
    duration: 60,
    service: 'consultation',
    notes: 'Prima consultație',
    status: 'confirmed'
  }
};
```

### Gym Timeline
```javascript
// GET /api/gym/timeline
const getGymTimelineRequest = {
  url: '/api/gym/timeline',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    'X-Tenant-ID': 'tenant-123',
    'X-Location-ID': 'location-456'
  },
  params: {
    date: '2024-01-15',
    classType: 'yoga',
    trainerId: 'trainer-123'
  }
};
```

### Hotel Timeline
```javascript
// GET /api/hotel/timeline
const getHotelTimelineRequest = {
  url: '/api/hotel/timeline',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    'X-Tenant-ID': 'tenant-123',
    'X-Location-ID': 'location-456'
  },
  params: {
    date: '2024-01-15',
    roomType: 'double',
    status: 'occupied'
  }
};
```

## Clienți Business-Specific (cu JWT)

### Dental Clients
```javascript
// GET /api/dental/clients
const getDentalClientsRequest = {
  url: '/api/dental/clients',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    'X-Tenant-ID': 'tenant-123',
    'X-Location-ID': 'location-456'
  },
  params: {
    search: 'Ion Popescu',
    status: 'active',
    lastVisitFrom: '2024-01-01'
  }
};

// POST /api/dental/clients
const createDentalClientRequest = {
  url: '/api/dental/clients',
  method: 'POST',
  headers: {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    'X-Tenant-ID': 'tenant-123',
    'X-Location-ID': 'location-456',
    'Content-Type': 'application/json'
  },
  data: {
    firstName: 'Ion',
    lastName: 'Popescu',
    email: 'ion.popescu@email.com',
    phone: '+40 123 456 789',
    birthDate: '1985-03-15',
    address: 'Strada Exemplu 123',
    medicalHistory: 'Alergie la penicilină',
    emergencyContact: {
      name: 'Maria Popescu',
      phone: '+40 987 654 321',
      relationship: 'soție'
    }
  }
};
```

## Pachete Business-Specific (cu JWT)

### Dental Packages
```javascript
// GET /api/dental/packages
const getDentalPackagesRequest = {
  url: '/api/dental/packages',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    'X-Tenant-ID': 'tenant-123',
    'X-Location-ID': 'location-456'
  },
  params: {
    category: 'preventive',
    active: true
  }
};
```

## Istoric (cu JWT)

### Obține istoricul
```javascript
// GET /api/history
const getHistoryRequest = {
  url: '/api/history',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    'X-Tenant-ID': 'tenant-123',
    'X-Location-ID': 'location-456'
  },
  params: {
    dateFrom: '2024-01-01',
    dateTo: '2024-01-31',
    type: 'appointment',
    userId: 'user-123'
  }
};
```

## Workflow-uri (cu JWT)

### Obține workflow-urile
```javascript
// GET /api/workflows
const getWorkflowsRequest = {
  url: '/api/workflows',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    'X-Tenant-ID': 'tenant-123',
    'X-Location-ID': 'location-456'
  },
  params: {
    status: 'active',
    type: 'automation'
  }
};
```

## Rapoarte (cu JWT)

### Generează raport
```javascript
// POST /api/reports
const generateReportRequest = {
  url: '/api/reports',
  method: 'POST',
  headers: {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    'X-Tenant-ID': 'tenant-123',
    'X-Location-ID': 'location-456',
    'Content-Type': 'application/json'
  },
  data: {
    type: 'monthly_sales',
    dateFrom: '2024-01-01',
    dateTo: '2024-01-31',
    format: 'pdf',
    includeCharts: true,
    filters: {
      paymentMethod: 'card',
      employeeId: 'employee-123'
    }
  }
};
```

## Roluri și Permisiuni (cu JWT)

### Obține rolurile
```javascript
// GET /api/roles
const getRolesRequest = {
  url: '/api/roles',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    'X-Tenant-ID': 'tenant-123',
    'X-Location-ID': 'location-456'
  }
};
```

## Date Utilizator (cu JWT)

### Obține datele utilizatorului
```javascript
// GET /api/userData
const getUserDataRequest = {
  url: '/api/userData',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    'X-Tenant-ID': 'tenant-123',
    'X-Location-ID': 'location-456'
  }
};
```

## Headers Comuni

### Headers pentru toate request-urile autentificate:
```javascript
const commonHeaders = {
  'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  'X-Tenant-ID': 'tenant-123',
  'X-Location-ID': 'location-456',
  'Content-Type': 'application/json',
  'Accept': 'application/json'
};
```

### Headers pentru request-uri fără autentificare:
```javascript
const publicHeaders = {
  'X-Tenant-ID': 'tenant-123',
  'Content-Type': 'application/json',
  'Accept': 'application/json'
};
```

## Utilizarea cu ApiClient

Toate aceste exemple pot fi folosite cu `ApiClient`:

```javascript
import apiClient from '@/api/core/client/ApiClient';

// Exemplu de utilizare
const response = await apiClient.post('/api/dental/timeline', {
  clientId: 'client-123',
  doctorId: 'doctor-456',
  date: '2024-01-20',
  time: '14:30',
  duration: 60,
  service: 'consultation'
});

// Sau cu parametri
const response = await apiClient.get('/api/invoices', {
  params: {
    page: 1,
    limit: 20,
    status: 'pending'
  }
});
``` 