# Statistics API Documentation

## Overview

API-ul de statistici oferă informații comprehensive despre performanța business-ului, inclusiv programări, clienți, încasări și inventar. **Toate statisticile pot fi obținute într-o singură cerere** prin endpoint-ul principal `/statistics/business`, care returnează toate metricile cu comparații față de perioadele anterioare.

## Base URL

```
GET /api/resources/{businessId}-{locationId}/statistics/{endpoint}
```

## Endpoints

### 1. Business Statistics (Comprehensive) - **ENDPOINT PRINCIPAL**

**Endpoint:** `GET /{businessId}-{locationId}/statistics/business`

**Description:** **Endpoint-ul principal** care returnează toate statisticile business-ului într-un singur call. Acesta este cel mai eficient mod de a obține toate informațiile necesare pentru dashboard.

**Response:**
```json
{
  "success": true,
  "data": {
    "appointments": {
      "today": 15,
      "yesterday": 12,
      "difference": 3,
      "percentageChange": 25.0
    },
    "clients": {
      "thisMonth": 45,
      "lastMonth": 38,
      "difference": 7,
      "percentageChange": 18.42
    },
    "visits": {
      "today": 23,
      "yesterday": 19,
      "difference": 4,
      "percentageChange": 21.05
    },
    "revenue": {
      "thisMonth": 12500.50,
      "lastMonth": 10800.00,
      "difference": 1700.50,
      "percentageChange": 15.75,
      "today": 850.00,
      "yesterday": 720.00,
      "dailyDifference": 130.00,
      "dailyPercentageChange": 18.06
    },
    "pickupAutomation": {
      "today": 8,
      "yesterday": 6,
      "difference": 2,
      "percentageChange": 33.33,
      "totalAutomated": 45,
      "successRate": 88.89
    },
    "inventory": {
      "totalProducts": 150,
      "lowStock": 12,
      "outOfStock": 3,
      "totalValue": 25000.00
    },
    "summary": {
      "totalRevenue": 12500.50,
      "totalClients": 45,
      "totalAppointments": 15,
      "totalVisits": 23,
      "totalPickups": 8,
      "averageRevenuePerClient": 277.79
    }
  },
  "meta": {
    "businessId": "business-123",
    "locationId": "location-456",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "operation": "business-statistics"
  }
}
```

### 2. Resource Type Statistics

**Endpoint:** `GET /{businessId}-{locationId}/statistics/{resourceType}`

**Parameters:**
- `resourceType`: Tipul resursei (timeline, clients, invoices, stocks, etc.)
- `startDate` (optional): Data de început (YYYY-MM-DD)
- `endDate` (optional): Data de sfârșit (YYYY-MM-DD)

**Example:** `GET /business-123-location-456/statistics/timeline?startDate=2024-01-01&endDate=2024-01-31`

**Response:**
```json
{
  "success": true,
  "data": {
    "resourceType": "timeline",
    "total": 150,
    "byDate": {
      "2024-01-15": 12,
      "2024-01-16": 15,
      "2024-01-17": 8
    },
    "byStatus": {
      "confirmed": 120,
      "pending": 20,
      "cancelled": 10
    },
    "totalValue": 8500.00,
    "averageValue": 56.67
  },
  "meta": {
    "businessId": "business-123",
    "locationId": "location-456",
    "resourceType": "timeline",
    "dateRange": {
      "startDate": "2024-01-01",
      "endDate": "2024-01-31"
    },
    "timestamp": "2024-01-15T10:30:00.000Z",
    "operation": "resource-type-statistics"
  }
}
```

### 3. Daily Appointment Statistics

**Endpoint:** `GET /{businessId}-{locationId}/statistics/appointments/daily`

**Parameters:**
- `days` (optional): Numărul de zile de analizat (default: 7)

**Example:** `GET /business-123-location-456/statistics/appointments/daily?days=14`

**Response:**
```json
{
  "success": true,
  "data": {
    "daysAnalyzed": 14,
    "totalAppointments": 180,
    "averagePerDay": 12.86,
    "byDate": {
      "2024-01-01": 10,
      "2024-01-02": 15,
      "2024-01-03": 12
    },
    "trend": "increasing"
  },
  "meta": {
    "businessId": "business-123",
    "locationId": "location-456",
    "resourceType": "timeline",
    "daysAnalyzed": 14,
    "timestamp": "2024-01-15T10:30:00.000Z",
    "operation": "daily-appointment-statistics"
  }
}
```

### 4. Monthly Revenue Statistics

**Endpoint:** `GET /{businessId}-{locationId}/statistics/revenue/monthly`

**Parameters:**
- `months` (optional): Numărul de luni de analizat (default: 6)

**Example:** `GET /business-123-location-456/statistics/revenue/monthly?months=12`

**Response:**
```json
{
  "success": true,
  "data": {
    "monthsAnalyzed": 12,
    "totalRevenue": 150000.00,
    "averagePerMonth": 12500.00,
    "byMonth": {
      "2023-02": 11000.00,
      "2023-03": 12000.00,
      "2023-04": 13000.00
    },
    "trend": "increasing"
  },
  "meta": {
    "businessId": "business-123",
    "locationId": "location-456",
    "resourceType": "invoices",
    "monthsAnalyzed": 12,
    "timestamp": "2024-01-15T10:30:00.000Z",
    "operation": "monthly-revenue-statistics"
  }
}
```

## Statistici Disponibile

### 1. Programări (Appointments)
- **Tip resursă:** `timeline`
- **Metrici:**
  - Programări azi vs ieri
  - Diferența absolută și procentuală
  - Tendința pe ultimele zile
  - Media zilnică

### 2. Clienți (Clients)
- **Tip resursă:** `clients`
- **Metrici:**
  - Clienți luna aceasta vs luna trecută
  - Diferența absolută și procentuală
  - Tendința pe ultimele luni
  - Media lunară

### 3. Vizite (Visits)
- **Tip resursă:** `visits`
- **Metrici:**
  - Vizite azi vs ieri
  - Diferența absolută și procentuală
  - Tendința pe ultimele zile
  - Media zilnică

### 4. Încasări (Revenue)
- **Tip resursă:** `invoices`
- **Metrici:**
  - Încasări luna aceasta vs luna trecută
  - Încasări azi vs ieri
  - Diferența absolută și procentuală (lunar și zilnic)
  - Tendința pe ultimele luni și zile
  - Media lunară și zilnică
  - Valoarea totală

### 5. Preluări Automate (Pickup Automation)
- **Tip resursă:** `pickups`
- **Metrici:**
  - Preluări automate azi vs ieri
  - Diferența absolută și procentuală
  - Total preluări automate
  - Rata de succes
  - Tendința pe ultimele zile

### 6. Inventar (Inventory)
- **Tip resursă:** `stocks`
- **Metrici:**
  - Total produse în stoc
  - Produse cu stoc scăzut
  - Produse fără stoc
  - Valoarea totală a inventarului

## Tipuri de Resurse Suportate

- `timeline` - Programări și evenimente
- `clients` - Clienți și pacienți
- `visits` - Vizite și check-in-uri
- `invoices` - Facturi și plăți
- `stocks` - Inventar și stocuri
- `sales` - Vânzări
- `activities` - Activități business
- `staff` - Personal
- `workflows` - Procese business
- `pickups` - Operațiuni de preluare automată

## Filtre și Parametri

### Filtre de Dată
- `startDate`: Data de început (YYYY-MM-DD)
- `endDate`: Data de sfârșit (YYYY-MM-DD)

### Filtre de Perioadă
- `days`: Numărul de zile pentru analiza zilnică
- `months`: Numărul de luni pentru analiza lunară

## Calculul Tendințelor

Tendințele sunt calculate automat și pot fi:
- `increasing` - Creștere (> 5% schimbare)
- `decreasing` - Scădere (< -5% schimbare)
- `stable` - Stabil (±5% schimbare)

## Exemple de Utilizare

### 🎯 Dashboard Principal (Recomandat)
```bash
# Toate statisticile într-un singur call - CEL MAI EFICIENT
GET /business-123-location-456/statistics/business
```

**Acest endpoint returnează toate statisticile necesare pentru dashboard într-o singură cerere:**
- ✅ Programări azi vs ieri
- ✅ Clienți luna aceasta vs luna trecută  
- ✅ Încasări luna aceasta vs luna trecută
- ✅ Inventar și stocuri
- ✅ Sumar și metrici de performanță

### Analiza Detaliată (Opțional)
```bash
# Programări pe ultimele 30 de zile (pentru analize detaliate)
GET /business-123-location-456/statistics/appointments/daily?days=30

# Încasări pe ultimele 12 luni (pentru analize detaliate)
GET /business-123-location-456/statistics/revenue/monthly?months=12

# Statistici pentru clienți în ianuarie (pentru analize detaliate)
GET /business-123-location-456/statistics/clients?startDate=2024-01-01&endDate=2024-01-31
```

**Notă:** Pentru majoritatea cazurilor, endpoint-ul principal `/statistics/business` este suficient și mai eficient.

## Error Handling

Toate endpoint-urile returnează răspunsuri consistente:

**Success:**
```json
{
  "success": true,
  "data": { ... },
  "meta": { ... }
}
```

**Error:**
```json
{
  "success": false,
  "message": "Error description",
  "meta": { ... }
}
```

## Performance Notes

- Statisticile sunt calculate în timp real din baza de date
- Pentru volume mari de date, consideră implementarea de cache
- Endpoint-urile suportă paginare pentru seturi mari de date
- Toate calculele sunt optimizate pentru performanță
