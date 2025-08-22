# Plan UX/UI pentru Aplicația App - Primul Pas

## Overview
Plan de implementare UX/UI pentru aplicația `app` care gestionează fluxul de la business info până la meniul principal, cu focus pe experiența utilizatorului și design-ul responsive.

## 🎯 Fluxul Principal al Aplicației

### 1. **Business Info** → **2. Location Selection** → **3. Main Menu**

```
afacerea-mea.ro → Business Info → Location Selection → Main Menu (Resources)
```

## 📋 Detalii Flux

### Pasul 1: Business Info
- **URL**: `afacerea-mea.ro` (sau subdomain specific)
- **Input**: Business ID din variabilă de mediu (ulterior din URL)
- **Output**: Informații business + lista locații (dacă autentificat)

### Pasul 2: Location Selection  
- **Trigger**: Doar dacă utilizatorul este autentificat
- **Input**: Lista locațiilor din business info
- **Output**: Locația selectată + acces la meniul principal

### Pasul 3: Main Application Layout
- **Trigger**: După selectarea locației
- **Input**: Structura de meniuri definită anterior
- **Output**: Interfața completă cu navbar, sidebar, conținut centru și drawer dreapta

## 🎨 Design System & Componente

### Paleta de Culori
```css
/* Primary Colors */
--primary-50: #eff6ff;
--primary-100: #dbeafe;
--primary-500: #3b82f6;
--primary-600: #2563eb;
--primary-700: #1d4ed8;

/* Neutral Colors */
--neutral-50: #f9fafb;
--neutral-100: #f3f4f6;
--neutral-200: #e5e7eb;
--neutral-300: #d1d5db;
--neutral-600: #4b5563;
--neutral-700: #374151;
--neutral-900: #111827;

/* Status Colors */
--success-500: #10b981;
--warning-500: #f59e0b;
--error-500: #ef4444;
--info-500: #06b6d4;
```

### Typography
```css
/* Headings */
--font-heading: 'Inter', system-ui, sans-serif;
--font-body: 'Inter', system-ui, sans-serif;

/* Font Sizes */
--text-xs: 0.75rem;
--text-sm: 0.875rem;
--text-base: 1rem;
--text-lg: 1.125rem;
--text-xl: 1.25rem;
--text-2xl: 1.5rem;
--text-3xl: 1.875rem;
--text-4xl: 2.25rem;
```

### Spacing & Layout
```css
/* Spacing Scale */
--space-1: 0.25rem;
--space-2: 0.5rem;
--space-3: 0.75rem;
--space-4: 1rem;
--space-6: 1.5rem;
--space-8: 2rem;
--space-12: 3rem;
--space-16: 4rem;

/* Breakpoints */
--breakpoint-sm: 640px;
--breakpoint-md: 768px;
--breakpoint-lg: 1024px;
--breakpoint-xl: 1280px;
```

## 🏗️ Structura Componentelor

### 1. Layout Components

#### AppLayout
```typescript
interface AppLayout {
  children: React.ReactNode;
  showSidebar?: boolean;
  showHeader?: boolean;
  showFooter?: boolean;
}
```

#### Header
```typescript
interface Header {
  businessName: string;
  locationName?: string;
  userInfo?: UserInfo;
  notifications?: Notification[];
  onLogout?: () => void;
}
```

#### Sidebar
```typescript
interface Sidebar {
  menuStructure: MenuGroup[];
  currentPath: string;
  collapsed?: boolean;
  onMenuClick: (menuId: string, submenuId: string) => void;
}

#### Drawer
```typescript
interface Drawer {
  isOpen: boolean;
  content: React.ReactNode;
  title?: string;
  onClose: () => void;
  width?: string;
}
```

### 2. Business Info Components

#### BusinessInfoCard
```typescript
interface BusinessInfoCard {
  businessInfo: BusinessInfo;
  isLoading?: boolean;
  error?: string;
}
```

#### LocationSelector
```typescript
interface LocationSelector {
  locations: LocationInfo[];
  selectedLocation?: string;
  onLocationSelect: (locationId: string) => void;
  isLoading?: boolean;
}
```

### 3. Menu Components

#### MenuGroup
```typescript
interface MenuGroup {
  id: string;
  title: string;
  icon: string;
  submenus: Submenu[];
  isExpanded?: boolean;
  onToggle?: () => void;
}
```

#### Submenu
```typescript
interface Submenu {
  id: string;
  title: string;
  icon: string;
  resourceTypes: string[];
  isActive?: boolean;
  onClick?: () => void;
}
```

## 📱 Responsive Design Strategy

### Mobile First Approach
```css
/* Base styles (mobile) */
.container {
  padding: var(--space-4);
  max-width: 100%;
}

/* Tablet */
@media (min-width: 768px) {
  .container {
    padding: var(--space-6);
    max-width: 768px;
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .container {
    padding: var(--space-8);
    max-width: 1024px;
  }
}
```

### Navigation Patterns
- **Mobile**: Bottom navigation + drawer menu
- **Tablet**: Sidebar collapsible + top navigation  
- **Desktop**: Navbar + sidebar stânga + drawer dreapta

## 🎯 Screens & Wireframes

### Screen 1: Business Info Page
```
┌─────────────────────────────────────────────────────────────┐
│ 🏥 Afacerea Mea                                    [Login] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  🦷 Cabinetul Dr. Popescu                          │   │
│  │                                                     │   │
│  │  📍 Strada Florilor, Nr. 15                        │   │
│  │     București, Sector 1                            │   │
│  │                                                     │   │
│  │  📞 021 123 4567                                   │   │
│  │  📧 contact@cabinet-popescu.ro                     │   │
│  │                                                     │   │
│  │  🕒 Program: Luni-Vineri 8:00-18:00               │   │
│  │                                                     │   │
│  │  [🔐 Autentificare]  [📞 Contact]                 │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  📍 Locații disponibile:                           │   │
│  │                                                     │   │
│  │  🔒 Autentifică-te pentru a vedea locațiile       │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Screen 2: Location Selection (Authenticated)
```
┌─────────────────────────────────────────────────────────────┐
│ 🏥 Cabinetul Dr. Popescu                    [Dr. Smith ▼] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Selectează o locație pentru a continua:                  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  🏢 Sediu Central                                  │   │
│  │  📍 Strada Florilor, Nr. 15                        │   │
│  │  📞 021 123 4567                                   │   │
│  │                                                     │   │
│  │  [✅ Selectează]                                   │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  🏢 Filiala Pipera                                 │   │
│  │  📍 Bulevardul Pipera, Nr. 45                      │   │
│  │  📞 021 987 6543                                   │   │
│  │                                                     │   │
│  │  [✅ Selectează]                                   │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```



## 🔧 Technical Implementation

### 1. Routing Structure
```typescript
// App routing
const routes = [
  {
    path: '/',
    component: BusinessInfoPage,
    exact: true
  },
  {
    path: '/locations',
    component: LocationSelectionPage,
    protected: true
  },
  {
    path: '/dashboard',
    component: DashboardPage,
    protected: true
  },
  {
    path: '/resources/:resourceType',
    component: ResourceListPage,
    protected: true
  }
];
```

### 2. State Management
```typescript
interface AppState {
  businessInfo: BusinessInfo | null;
  selectedLocation: LocationInfo | null;
  userInfo: UserInfo | null;
  menuStructure: MenuGroup[];
  currentPath: string;
  isLoading: boolean;
  error: string | null;
}
```

### 3. API Integration
```typescript
// Business info API
const getBusinessInfo = async (businessId: string) => {
  const response = await fetch(`/api/business-info/${businessId}`);
  return response.json();
};

// Location selection
const selectLocation = async (businessId: string, locationId: string) => {
  const response = await fetch('/api/locations/select', {
    method: 'POST',
    body: JSON.stringify({ businessId, locationId })
  });
  return response.json();
};
```

## 🎨 UI Components Library

### Buttons
```typescript
// Primary Button
<Button variant="primary" size="md" onClick={handleClick}>
  Autentificare
</Button>

// Secondary Button
<Button variant="secondary" size="sm" onClick={handleClick}>
  Contact
</Button>

// Icon Button
<IconButton icon="settings" onClick={handleClick} />
```

### Cards
```typescript
// Info Card
<Card>
  <CardHeader title="Business Info" />
  <CardBody>
    <BusinessInfoContent data={businessInfo} />
  </CardBody>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>
```

### Navigation
```typescript
// Breadcrumb
<Breadcrumb items={[
  { label: 'Business Info', path: '/' },
  { label: 'Locations', path: '/locations' },
  { label: 'Dashboard', path: '/dashboard' }
]} />

// Sidebar Menu
<SidebarMenu
  items={menuStructure}
  activeItem={currentPath}
  onItemClick={handleMenuClick}
/>
```

## 📊 Performance & Accessibility

### Performance
- **Lazy Loading**: Componente încărcate la cerere
- **Code Splitting**: Bundle-uri separate pentru fiecare rută
- **Caching**: Cache pentru business info și menu structure
- **Optimization**: Imagini optimizate și compresie

### Accessibility
- **ARIA Labels**: Etichete pentru screen readers
- **Keyboard Navigation**: Navigare completă cu tastatura
- **Color Contrast**: Contrast de culoare conform WCAG
- **Focus Management**: Management focus pentru modal-uri

## 🚀 Next Steps

1. **Implementare Business Info Page**
2. **Implementare Location Selection**
3. **Implementare Main Menu Dashboard**
4. **Integrare cu API-urile existente**
5. **Testare responsive design**
6. **Optimizare performanță**
7. **Testare accessibility**

Acest plan oferă o bază solidă pentru implementarea UX/UI a aplicației, cu focus pe experiența utilizatorului și scalabilitatea pe termen lung.
