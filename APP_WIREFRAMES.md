# Wireframes & Mockups pentru Aplicația App

## Overview
Wireframes detaliate și mockups vizuale pentru fluxul principal al aplicației: Business Info → Location Selection → Main Menu.

## 🎨 Design Tokens & Styling

### Color Palette
```css
/* Primary Brand Colors */
--brand-primary: #2563eb;      /* Blue 600 */
--brand-secondary: #1e40af;    /* Blue 700 */
--brand-accent: #3b82f6;       /* Blue 500 */

/* Semantic Colors */
--success: #10b981;            /* Green 500 */
--warning: #f59e0b;            /* Amber 500 */
--error: #ef4444;              /* Red 500 */
--info: #06b6d4;               /* Cyan 500 */

/* Neutral Colors */
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
```

### Typography Scale
```css
/* Font Families */
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;

/* Font Sizes */
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
--text-3xl: 1.875rem;  /* 30px */
--text-4xl: 2.25rem;   /* 36px */
```

## 📱 Screen 1: Business Info Page

### Desktop Layout (1200px+)
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 🏥 Afacerea Mea                                    [🔔] [👤 Login]        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  🦷 Cabinetul Dr. Popescu                                          │   │
│  │                                                                     │   │
│  │  📍 Strada Florilor, Nr. 15                                        │   │
│  │     București, Sector 1, 010123                                    │   │
│  │                                                                     │   │
│  │  📞 021 123 4567                                                   │   │
│  │  📧 contact@cabinet-popescu.ro                                     │   │
│  │  🌐 www.cabinet-popescu.ro                                         │   │
│  │                                                                     │   │
│  │  🕒 Program:                                                       │   │
│  │     Luni-Vineri: 8:00-18:00                                        │   │
│  │     Sâmbătă: 9:00-14:00                                            │   │
│  │     Duminică: Închis                                               │   │
│  │                                                                     │   │
│  │  [🔐 Autentificare]  [📞 Contact]  [📍 Direcții]                 │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  📍 Locații disponibile:                                           │   │
│  │                                                                     │   │
│  │  🔒 Autentifică-te pentru a vedea și gestiona locațiile           │   │
│  │                                                                     │   │
│  │  [🔐 Autentificare]                                                │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Mobile Layout (375px)
```
┌─────────────────────────────────────────┐
│ 🏥 Afacerea Mea              [☰] [👤]  │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐   │
│  │                                 │   │
│  │  🦷 Cabinetul Dr. Popescu      │   │
│  │                                 │   │
│  │  📍 Strada Florilor, Nr. 15    │   │
│  │     București, Sector 1        │   │
│  │                                 │   │
│  │  📞 021 123 4567               │   │
│  │  📧 contact@cabinet-popescu.ro │   │
│  │                                 │   │
│  │  🕒 Luni-Vineri: 8:00-18:00    │   │
│  │                                 │   │
│  │  [🔐 Autentificare]            │   │
│  │  [📞 Contact]                  │   │
│  │                                 │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │                                 │   │
│  │  📍 Locații disponibile:       │   │
│  │                                 │   │
│  │  🔒 Autentifică-te pentru a    │   │
│  │     vedea locațiile            │   │
│  │                                 │   │
│  │  [🔐 Autentificare]            │   │
│  │                                 │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

## 📱 Screen 2: Location Selection (Authenticated)

### Desktop Layout
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 🏥 Cabinetul Dr. Popescu                    [🔔] [Dr. Smith ▼] [Logout]    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Selectează o locație pentru a continua:                                  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  🏢 Sediu Central                                                  │   │
│  │  📍 Strada Florilor, Nr. 15                                        │   │
│  │     București, Sector 1, 010123                                    │   │
│  │  📞 021 123 4567                                                   │   │
│  │  📧 sediu@cabinet-popescu.ro                                       │   │
│  │                                                                     │   │
│  │  🕒 Program: Luni-Vineri 8:00-18:00                                │   │
│  │  👥 4 angajați activi                                              │   │
│  │                                                                     │   │
│  │  [✅ Selectează]  [📍 Vezi pe hartă]                              │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                     │   │
│  │  🏢 Filiala Pipera                                                 │   │
│  │  📍 Bulevardul Pipera, Nr. 45                                      │   │
│  │     București, Sector 1, 014142                                    │   │
│  │  📞 021 987 6543                                                   │   │
│  │  📧 pipera@cabinet-popescu.ro                                      │   │
│  │                                                                     │   │
│  │  🕒 Program: Luni-Vineri 9:00-17:00                                │   │
│  │  👥 2 angajați activi                                              │   │
│  │                                                                     │   │
│  │  [✅ Selectează]  [📍 Vezi pe hartă]                              │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Mobile Layout
```
┌─────────────────────────────────────────┐
│ 🏥 Cabinetul Dr. Popescu    [👤] [🔔]  │
├─────────────────────────────────────────┤
│                                         │
│  Selectează o locație:                 │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │                                 │   │
│  │  🏢 Sediu Central              │   │
│  │  📍 Strada Florilor, Nr. 15    │   │
│  │  📞 021 123 4567               │   │
│  │                                 │   │
│  │  👥 4 angajați activi          │   │
│  │                                 │   │
│  │  [✅ Selectează]               │   │
│  │                                 │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │                                 │   │
│  │  🏢 Filiala Pipera             │   │
│  │  📍 Bulevardul Pipera, Nr. 45  │   │
│  │  📞 021 987 6543               │   │
│  │                                 │   │
│  │  👥 2 angajați activi          │   │
│  │                                 │   │
│  │  [✅ Selectează]               │   │
│  │                                 │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```



## 🎨 Component Design Specifications

### Button Components
```css
/* Primary Button */
.btn-primary {
  background: var(--brand-primary);
  color: var(--white);
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary:hover {
  background: var(--brand-secondary);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
}

/* Secondary Button */
.btn-secondary {
  background: var(--white);
  color: var(--brand-primary);
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  border: 2px solid var(--brand-primary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary:hover {
  background: var(--brand-primary);
  color: var(--white);
}
```

### Card Components
```css
/* Info Card */
.card {
  background: var(--white);
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 1px solid var(--gray-200);
  transition: all 0.2s ease;
}

.card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

/* Dashboard Card */
.dashboard-card {
  background: var(--white);
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border: 1px solid var(--gray-100);
  cursor: pointer;
  transition: all 0.3s ease;
}

.dashboard-card:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  transform: translateY(-4px);
}
```

### Navigation Components
```css
/* Header */
.header {
  background: var(--white);
  border-bottom: 1px solid var(--gray-200);
  padding: 16px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 0;
  z-index: 100;
}

/* Sidebar */
.sidebar {
  background: var(--white);
  border-right: 1px solid var(--gray-200);
  width: 280px;
  height: 100vh;
  position: fixed;
  left: 0;
  top: 0;
  padding: 24px 0;
  overflow-y: auto;
}

/* Bottom Navigation (Mobile) */
.bottom-nav {
  background: var(--white);
  border-top: 1px solid var(--gray-200);
  padding: 12px 0;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-around;
  align-items: center;
}
```

## 📊 Responsive Breakpoints

```css
/* Mobile First Approach */
.container {
  padding: 16px;
  max-width: 100%;
}

/* Tablet (768px+) */
@media (min-width: 768px) {
  .container {
    padding: 24px;
    max-width: 768px;
    margin: 0 auto;
  }
}

/* Desktop (1024px+) */
@media (min-width: 1024px) {
  .container {
    padding: 32px;
    max-width: 1024px;
    margin: 0 auto;
  }
}

/* Large Desktop (1280px+) */
@media (min-width: 1280px) {
  .container {
    padding: 40px;
    max-width: 1280px;
    margin: 0 auto;
  }
}
```

## 🎯 Interactive States

### Loading States
```css
.skeleton {
  background: linear-gradient(90deg, var(--gray-200) 25%, var(--gray-100) 50%, var(--gray-200) 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
}

@keyframes loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

### Error States
```css
.error-card {
  background: var(--error);
  color: var(--white);
  padding: 16px;
  border-radius: 8px;
  margin: 16px 0;
  display: flex;
  align-items: center;
  gap: 12px;
}
```

### Success States
```css
.success-card {
  background: var(--success);
  color: var(--white);
  padding: 16px;
  border-radius: 8px;
  margin: 16px 0;
  display: flex;
  align-items: center;
  gap: 12px;
}
```

Aceste wireframes oferă o bază vizuală clară pentru implementarea interfeței utilizator, cu focus pe experiența responsive și accesibilitate.
