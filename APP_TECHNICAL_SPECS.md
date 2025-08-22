# Specificații Tehnice pentru Implementarea App UX/UI

## Overview
Specificații tehnice detaliate pentru implementarea planului UX/UI al aplicației `app`, incluzând arhitectura, componente și integrarea cu API-urile existente.

## 🏗️ Arhitectura Aplicației

### Structura de Fișiere
```
app/
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppLayout.tsx
│   │   │   ├── Navbar.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Drawer.tsx
│   │   │   └── BottomNavigation.tsx
│   │   ├── business-info/
│   │   │   ├── BusinessInfoCard.tsx
│   │   │   ├── LocationSelector.tsx
│   │   │   └── BusinessInfoPage.tsx
│   │   ├── dashboard/
│   │   │   ├── DashboardCard.tsx
│   │   │   ├── MenuGroup.tsx
│   │   │   ├── Submenu.tsx
│   │   │   └── DashboardPage.tsx
│   │   ├── common/
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Loading.tsx
│   │   │   └── ErrorBoundary.tsx
│   │   └── ui/
│   │       ├── Icon.tsx
│   │       ├── Badge.tsx
│   │       └── Modal.tsx
│   ├── hooks/
│   │   ├── useBusinessInfo.ts
│   │   ├── useLocation.ts
│   │   ├── useAuth.ts
│   │   └── useMenu.ts
│   ├── services/
│   │   ├── api.ts
│   │   ├── businessInfoService.ts
│   │   ├── locationService.ts
│   │   └── authService.ts
│   ├── store/
│   │   ├── index.ts
│   │   ├── businessSlice.ts
│   │   ├── locationSlice.ts
│   │   └── userSlice.ts
│   ├── types/
│   │   ├── business.ts
│   │   ├── location.ts
│   │   ├── user.ts
│   │   └── menu.ts
│   ├── utils/
│   │   ├── constants.ts
│   │   ├── helpers.ts
│   │   └── validators.ts
│   └── styles/
│       ├── globals.css
│       ├── components.css
│       └── variables.css
```

## 🔧 Implementare Tehnică

### 1. State Management (Redux Toolkit)

#### Business Slice
```typescript
// store/businessSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { BusinessInfo } from '../types/business';
import { businessInfoService } from '../services/businessInfoService';

interface BusinessState {
  businessInfo: BusinessInfo | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: BusinessState = {
  businessInfo: null,
  isLoading: false,
  error: null,
};

export const fetchBusinessInfo = createAsyncThunk(
  'business/fetchBusinessInfo',
  async (businessId: string) => {
    const response = await businessInfoService.getBusinessInfo(businessId);
    return response;
  }
);

const businessSlice = createSlice({
  name: 'business',
  initialState,
  reducers: {
    clearBusinessInfo: (state) => {
      state.businessInfo = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBusinessInfo.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchBusinessInfo.fulfilled, (state, action) => {
        state.isLoading = false;
        state.businessInfo = action.payload;
      })
      .addCase(fetchBusinessInfo.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch business info';
      });
  },
});

export const { clearBusinessInfo } = businessSlice.actions;
export default businessSlice.reducer;
```

#### Location Slice
```typescript
// store/locationSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { LocationInfo } from '../types/location';

interface LocationState {
  selectedLocation: LocationInfo | null;
  availableLocations: LocationInfo[];
}

const initialState: LocationState = {
  selectedLocation: null,
  availableLocations: [],
};

const locationSlice = createSlice({
  name: 'location',
  initialState,
  reducers: {
    setSelectedLocation: (state, action: PayloadAction<LocationInfo>) => {
      state.selectedLocation = action.payload;
    },
    setAvailableLocations: (state, action: PayloadAction<LocationInfo[]>) => {
      state.availableLocations = action.payload;
    },
    clearLocation: (state) => {
      state.selectedLocation = null;
    },
  },
});

export const { setSelectedLocation, setAvailableLocations, clearLocation } = locationSlice.actions;
export default locationSlice.reducer;
```

### 2. API Services

#### Business Info Service
```typescript
// services/businessInfoService.ts
import { BusinessInfo } from '../types/business';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

export class BusinessInfoService {
  async getBusinessInfo(businessId: string): Promise<BusinessInfo> {
    const response = await fetch(`${API_BASE_URL}/business-info/${businessId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch business info: ${response.statusText}`);
    }

    return response.json();
  }

  async getBusinessLocations(businessId: string): Promise<LocationInfo[]> {
    const response = await fetch(`${API_BASE_URL}/business-info/${businessId}/locations`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch locations: ${response.statusText}`);
    }

    return response.json();
  }

  private getAuthToken(): string | null {
    return localStorage.getItem('authToken');
  }
}

export const businessInfoService = new BusinessInfoService();
```

### 3. Custom Hooks

#### useBusinessInfo Hook
```typescript
// hooks/useBusinessInfo.ts
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import { fetchBusinessInfo } from '../store/businessSlice';

export const useBusinessInfo = (businessId: string) => {
  const dispatch = useDispatch<AppDispatch>();
  const { businessInfo, isLoading, error } = useSelector(
    (state: RootState) => state.business
  );

  useEffect(() => {
    if (businessId && !businessInfo) {
      dispatch(fetchBusinessInfo(businessId));
    }
  }, [dispatch, businessId, businessInfo]);

  return {
    businessInfo,
    isLoading,
    error,
    refetch: () => dispatch(fetchBusinessInfo(businessId)),
  };
};
```

#### useLocation Hook
```typescript
// hooks/useLocation.ts
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import { setSelectedLocation, setAvailableLocations } from '../store/locationSlice';

export const useLocation = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { selectedLocation, availableLocations } = useSelector(
    (state: RootState) => state.location
  );

  const selectLocation = (location: LocationInfo) => {
    dispatch(setSelectedLocation(location));
    localStorage.setItem('selectedLocationId', location.locationId);
  };

  const setLocations = (locations: LocationInfo[]) => {
    dispatch(setAvailableLocations(locations));
  };

  return {
    selectedLocation,
    availableLocations,
    selectLocation,
    setLocations,
  };
};
```

### 4. Componente React

#### AppLayout Component
```typescript
// components/layout/AppLayout.tsx
import React from 'react';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { Drawer } from './Drawer';

interface AppLayoutProps {
  children: React.ReactNode;
  showSidebar?: boolean;
  showDrawer?: boolean;
  drawerContent?: React.ReactNode;
  drawerTitle?: string;
  onDrawerClose?: () => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  showSidebar = true,
  showDrawer = false,
  drawerContent,
  drawerTitle,
  onDrawerClose,
}) => {
  return (
    <div className="app-layout">
      <Navbar />
      <div className="app-content">
        {showSidebar && <Sidebar />}
        <main className="main-content">
          {children}
        </main>
        {showDrawer && (
          <Drawer
            isOpen={showDrawer}
            content={drawerContent}
            title={drawerTitle}
            onClose={onDrawerClose}
          />
        )}
      </div>
    </div>
  );
};
```

#### Navbar Component
```typescript
// components/layout/Navbar.tsx
import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useLocation } from '../../hooks/useLocation';

interface NavbarProps {
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onLogout }) => {
  const { userInfo } = useAuth();
  const { selectedLocation } = useLocation();

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <h1>🏥 Afacerea Mea</h1>
        {selectedLocation && (
          <span className="location-name">- {selectedLocation.name}</span>
        )}
      </div>
      
      <div className="navbar-actions">
        <button className="notification-btn">
          🔔 <span className="badge">3</span>
        </button>
        
        <div className="user-menu">
          <span>{userInfo?.name || 'Utilizator'}</span>
          <button onClick={onLogout}>Logout</button>
        </div>
      </div>
    </nav>
  );
};
```

#### Sidebar Component
```typescript
// components/layout/Sidebar.tsx
import React from 'react';
import { useMenu } from '../../hooks/useMenu';
import { MenuGroup } from '../dashboard/MenuGroup';

export const Sidebar: React.FC = () => {
  const { menuStructure, currentPath, onMenuClick } = useMenu();

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        {menuStructure.map((menuGroup) => (
          <MenuGroup
            key={menuGroup.id}
            menuGroup={menuGroup}
            currentPath={currentPath}
            onMenuClick={onMenuClick}
          />
        ))}
      </nav>
    </aside>
  );
};
```

#### Drawer Component
```typescript
// components/layout/Drawer.tsx
import React from 'react';

interface DrawerProps {
  isOpen: boolean;
  content: React.ReactNode;
  title?: string;
  onClose: () => void;
  width?: string;
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  content,
  title,
  onClose,
  width = '400px',
}) => {
  if (!isOpen) return null;

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div 
        className="drawer" 
        style={{ width }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="drawer-header">
          {title && <h2>{title}</h2>}
          <button className="drawer-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="drawer-content">
          {content}
        </div>
      </div>
    </div>
  );
};
```

#### BusinessInfoCard Component
```typescript
// components/business-info/BusinessInfoCard.tsx
import React from 'react';
import { BusinessInfo } from '../../types/business';
import { Card, Button, Icon } from '../common';

interface BusinessInfoCardProps {
  businessInfo: BusinessInfo;
  onLogin?: () => void;
  onContact?: () => void;
  onDirections?: () => void;
}

export const BusinessInfoCard: React.FC<BusinessInfoCardProps> = ({
  businessInfo,
  onLogin,
  onContact,
  onDirections,
}) => {
  return (
    <Card className="business-info-card">
      <div className="business-header">
        <Icon name="building" size="lg" />
        <h1 className="business-name">{businessInfo.businessName}</h1>
      </div>

      <div className="business-details">
        <div className="detail-item">
          <Icon name="map-pin" />
          <span>{businessInfo.locations[0]?.address}</span>
        </div>

        <div className="detail-item">
          <Icon name="phone" />
          <span>{businessInfo.locations[0]?.phone}</span>
        </div>

        <div className="detail-item">
          <Icon name="mail" />
          <span>{businessInfo.locations[0]?.email}</span>
        </div>

        <div className="detail-item">
          <Icon name="clock" />
          <span>Program: Luni-Vineri 8:00-18:00</span>
        </div>
      </div>

      <div className="business-actions">
        {onLogin && (
          <Button variant="primary" onClick={onLogin}>
            <Icon name="lock" />
            Autentificare
          </Button>
        )}
        
        {onContact && (
          <Button variant="secondary" onClick={onContact}>
            <Icon name="phone" />
            Contact
          </Button>
        )}
        
        {onDirections && (
          <Button variant="secondary" onClick={onDirections}>
            <Icon name="map-pin" />
            Direcții
          </Button>
        )}
      </div>
    </Card>
  );
};
```

#### LocationSelector Component
```typescript
// components/business-info/LocationSelector.tsx
import React from 'react';
import { LocationInfo } from '../../types/location';
import { Card, Button, Icon } from '../common';

interface LocationSelectorProps {
  locations: LocationInfo[];
  selectedLocationId?: string;
  onLocationSelect: (location: LocationInfo) => void;
  onViewMap?: (location: LocationInfo) => void;
}

export const LocationSelector: React.FC<LocationSelectorProps> = ({
  locations,
  selectedLocationId,
  onLocationSelect,
  onViewMap,
}) => {
  return (
    <div className="location-selector">
      <h2>Selectează o locație pentru a continua:</h2>
      
      <div className="locations-grid">
        {locations.map((location) => (
          <Card key={location.locationId} className="location-card">
            <div className="location-header">
              <Icon name="building" size="md" />
              <h3>{location.name}</h3>
            </div>

            <div className="location-details">
              <div className="detail-item">
                <Icon name="map-pin" />
                <span>{location.address}</span>
              </div>

              <div className="detail-item">
                <Icon name="phone" />
                <span>{location.phone}</span>
              </div>

              <div className="detail-item">
                <Icon name="mail" />
                <span>{location.email}</span>
              </div>

              <div className="detail-item">
                <Icon name="clock" />
                <span>Program: Luni-Vineri 8:00-18:00</span>
              </div>
            </div>

            <div className="location-actions">
              <Button
                variant="primary"
                onClick={() => onLocationSelect(location)}
                disabled={selectedLocationId === location.locationId}
              >
                <Icon name="check" />
                {selectedLocationId === location.locationId ? 'Selectat' : 'Selectează'}
              </Button>

              {onViewMap && (
                <Button variant="secondary" onClick={() => onViewMap(location)}>
                  <Icon name="map-pin" />
                  Vezi pe hartă
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
```

### 5. Routing Configuration

#### App Router
```typescript
// App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import { BusinessInfoPage } from './components/business-info/BusinessInfoPage';
import { LocationSelectionPage } from './components/business-info/LocationSelectionPage';
import { DashboardPage } from './components/dashboard/DashboardPage';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { useAuth } from './hooks/useAuth';

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <Router>
        <Routes>
          <Route path="/" element={<BusinessInfoPage />} />
          <Route
            path="/locations"
            element={
              <ProtectedRoute>
                <LocationSelectionPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/resources/:resourceType"
            element={
              <ProtectedRoute>
                <ResourceListPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </Provider>
  );
};

export default App;
```

### 6. Styling & CSS

#### Global Styles
```css
/* styles/globals.css */
:root {
  /* Color Variables */
  --brand-primary: #2563eb;
  --brand-secondary: #1e40af;
  --brand-accent: #3b82f6;
  
  --success: #10b981;
  --warning: #f59e0b;
  --error: #ef4444;
  --info: #06b6d4;
  
  --white: #ffffff;
  --gray-50: #f9fafb;
  --gray-100: #f3f4f6;
  --gray-200: #e5e7eb;
  --gray-300: #d1d5db;
  --gray-400: #9ca3af;
  --gray-500: #6b7280;
  --gray-600: #4b5563;
  --gray-700: #374151;
  --gray-800: #1f2937;
  --gray-900: #111827;
  
  /* Typography */
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
  
  /* Spacing */
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
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 0;
  font-family: var(--font-sans);
  font-size: 16px;
  line-height: 1.5;
  color: var(--gray-900);
  background-color: var(--gray-50);
}

/* Responsive Container */
.container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--space-4);
}

@media (min-width: 768px) {
  .container {
    padding: 0 var(--space-6);
  }
}

@media (min-width: 1024px) {
  .container {
    padding: 0 var(--space-8);
  }
}
```

### 7. Performance Optimizations

#### Code Splitting
```typescript
// Lazy loading pentru componente mari
const DashboardPage = React.lazy(() => import('./components/dashboard/DashboardPage'));
const ResourceListPage = React.lazy(() => import('./components/resources/ResourceListPage'));

// Suspense wrapper
const App: React.FC = () => {
  return (
    <Provider store={store}>
      <Router>
        <Suspense fallback={<Loading />}>
          <Routes>
            {/* ... routes */}
          </Routes>
        </Suspense>
      </Router>
    </Provider>
  );
};
```

#### Memoization
```typescript
// Optimizare pentru componente care se re-renderizează frecvent
export const DashboardCard = React.memo<DashboardCardProps>(({ 
  title, 
  value, 
  icon, 
  onClick 
}) => {
  return (
    <Card className="dashboard-card" onClick={onClick}>
      <div className="card-header">
        <Icon name={icon} />
        <h3>{title}</h3>
      </div>
      <div className="card-value">{value}</div>
    </Card>
  );
});
```

## 🚀 Deployment & Environment

### Environment Variables
```bash
# .env.production
REACT_APP_API_URL=https://api.afacerea-mea.ro
REACT_APP_ENVIRONMENT=production
REACT_APP_VERSION=1.0.0

# .env.development
REACT_APP_API_URL=http://localhost:3000
REACT_APP_ENVIRONMENT=development
REACT_APP_VERSION=1.0.0
```

### Build Configuration
```json
// package.json
{
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "build:prod": "GENERATE_SOURCEMAP=false react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.8.0",
    "react-redux": "^8.0.5",
    "@reduxjs/toolkit": "^1.9.0",
    "axios": "^1.3.0"
  },
  "devDependencies": {
    "@types/react": "^18.0.28",
    "@types/react-dom": "^18.0.11",
    "typescript": "^4.9.5"
  }
}
```

### 8. Layout CSS Styles

```css
/* Navbar */
.navbar {
  background: var(--white);
  border-bottom: 1px solid var(--gray-200);
  padding: 16px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 0;
  z-index: 100;
  height: 64px;
}

.navbar-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.navbar-brand h1 {
  margin: 0;
  font-size: var(--text-xl);
  font-weight: 600;
  color: var(--gray-900);
}

.location-name {
  color: var(--gray-600);
  font-size: var(--text-sm);
}

.navbar-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.notification-btn {
  position: relative;
  background: none;
  border: none;
  font-size: var(--text-lg);
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  transition: background-color 0.2s ease;
}

.notification-btn:hover {
  background: var(--gray-100);
}

.badge {
  position: absolute;
  top: 0;
  right: 0;
  background: var(--error);
  color: var(--white);
  font-size: var(--text-xs);
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 18px;
  text-align: center;
}

.user-menu {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* App Layout */
.app-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.app-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.main-content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
  background: var(--gray-50);
}

/* Sidebar */
.sidebar {
  background: var(--white);
  border-right: 1px solid var(--gray-200);
  width: 280px;
  height: 100%;
  overflow-y: auto;
  flex-shrink: 0;
}

.sidebar-nav {
  padding: 16px 0;
}

/* Drawer */
.drawer-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  justify-content: flex-end;
}

.drawer {
  background: var(--white);
  height: 100%;
  box-shadow: -4px 0 12px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
}

.drawer-header {
  padding: 20px 24px;
  border-bottom: 1px solid var(--gray-200);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.drawer-header h2 {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: 600;
}

.drawer-close {
  background: none;
  border: none;
  font-size: var(--text-lg);
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  transition: background-color 0.2s ease;
}

.drawer-close:hover {
  background: var(--gray-100);
}

.drawer-content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

/* Responsive Design */
@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    left: -280px;
    top: 64px;
    z-index: 200;
    transition: left 0.3s ease;
  }
  
  .sidebar.open {
    left: 0;
  }
  
  .drawer {
    width: 100% !important;
  }
}
```

Aceste specificații tehnice oferă o bază solidă pentru implementarea planului UX/UI, cu focus pe performanță, scalabilitate și mentenabilitate.
