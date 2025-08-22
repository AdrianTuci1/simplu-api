// Menu structure definition for resource organization
// Groups the 13 simplified resource types into logical menus and submenus

export interface MenuGroup {
  id: string;
  title: string;
  icon: string;
  description: string;
  order: number;
  submenus: Submenu[];
}

export interface Submenu {
  id: string;
  title: string;
  icon: string;
  description: string;
  resourceTypes: ResourceType[];
  order: number;
  permissions: string[];
}

import { ResourceType } from './base-resource';

// Main menu structure for organizing resources
export const MENU_STRUCTURE: MenuGroup[] = [
  {
    id: 'operations',
    title: 'Operațiuni',
    icon: 'calendar-days',
    description: 'Gestionarea operațiunilor zilnice și activităților',
    order: 1,
    submenus: [
      {
        id: 'planning',
        title: 'Planificare',
        icon: 'calendar-check',
        description: 'Timeline, programări și evenimente',
        resourceTypes: ['timeline'],
        order: 1,
        permissions: ['timeline:read', 'timeline:create', 'timeline:update']
      },
      {
        id: 'people',
        title: 'Persoane',
        icon: 'users',
        description: 'Gestionarea clienților și personalului',
        resourceTypes: ['clients', 'staff'],
        order: 2,
        permissions: ['clients:read', 'clients:create', 'staff:read', 'staff:create']
      },
      {
        id: 'activities',
        title: 'Activități',
        icon: 'activity',
        description: 'Jurnal activități și istoric',
        resourceTypes: ['activities', 'history'],
        order: 3,
        permissions: ['activities:read', 'history:read']
      }
    ]
  },
  {
    id: 'business',
    title: 'Business',
    icon: 'briefcase',
    description: 'Managementul business-ului și vânzărilor',
    order: 2,
    submenus: [
      {
        id: 'sales',
        title: 'Vânzări',
        icon: 'trending-up',
        description: 'Gestionarea vânzărilor și tranzacțiilor',
        resourceTypes: ['sales'],
        order: 1,
        permissions: ['sales:read', 'sales:create', 'sales:update']
      },
      {
        id: 'inventory',
        title: 'Inventar',
        icon: 'package',
        description: 'Stocuri și managementul inventarului',
        resourceTypes: ['stocks'],
        order: 2,
        permissions: ['stocks:read', 'stocks:create', 'stocks:update']
      },
      {
        id: 'processes',
        title: 'Procese',
        icon: 'git-branch',
        description: 'Workflow-uri și procese business',
        resourceTypes: ['workflows'],
        order: 3,
        permissions: ['workflows:read', 'workflows:create', 'workflows:update']
      }
    ]
  },
  {
    id: 'finance',
    title: 'Financiar',
    icon: 'credit-card',
    description: 'Managementul financiar și facturare',
    order: 3,
    submenus: [
      {
        id: 'billing',
        title: 'Facturare',
        icon: 'receipt',
        description: 'Facturi și plăți',
        resourceTypes: ['invoices'],
        order: 1,
        permissions: ['invoices:read', 'invoices:create', 'invoices:update']
      }
    ]
  },
  {
    id: 'analytics',
    title: 'Analize',
    icon: 'bar-chart-3',
    description: 'Rapoarte și analize business',
    order: 4,
    submenus: [
      {
        id: 'reports',
        title: 'Rapoarte',
        icon: 'pie-chart',
        description: 'Rapoarte și statistici',
        resourceTypes: ['reports'],
        order: 1,
        permissions: ['reports:read', 'reports:create']
      }
    ]
  },
  {
    id: 'administration',
    title: 'Administrare',
    icon: 'settings',
    description: 'Configurări și administrare sistem',
    order: 5,
    submenus: [
      {
        id: 'access',
        title: 'Control Acces',
        icon: 'shield-check',
        description: 'Roluri și permisiuni utilizatori',
        resourceTypes: ['roles', 'permissions'],
        order: 1,
        permissions: ['roles:read', 'roles:create', 'permissions:read']
      },
      {
        id: 'users',
        title: 'Utilizatori',
        icon: 'user-cog',
        description: 'Date și configurări utilizatori',
        resourceTypes: ['userData'],
        order: 2,
        permissions: ['userData:read', 'userData:update']
      }
    ]
  }
];

// Helper functions for menu management
export function getMenuById(menuId: string): MenuGroup | undefined {
  return MENU_STRUCTURE.find(menu => menu.id === menuId);
}

export function getSubmenuById(submenuId: string): { menu: MenuGroup; submenu: Submenu } | undefined {
  for (const menu of MENU_STRUCTURE) {
    const submenu = menu.submenus.find(sub => sub.id === submenuId);
    if (submenu) {
      return { menu, submenu };
    }
  }
  return undefined;
}

export function getResourceTypeMenu(resourceType: ResourceType): { menu: MenuGroup; submenu: Submenu } | undefined {
  for (const menu of MENU_STRUCTURE) {
    for (const submenu of menu.submenus) {
      if (submenu.resourceTypes.includes(resourceType)) {
        return { menu, submenu };
      }
    }
  }
  return undefined;
}

export function getUserAccessibleMenus(userPermissions: string[]): MenuGroup[] {
  return MENU_STRUCTURE.map(menu => ({
    ...menu,
    submenus: menu.submenus.filter(submenu => 
      submenu.permissions.some(permission => userPermissions.includes(permission))
    )
  })).filter(menu => menu.submenus.length > 0);
}

// Flat list of all resource types organized by menu structure
export const RESOURCE_MENU_MAP: Record<ResourceType, { menuId: string; submenuId: string }> = {
  timeline: { menuId: 'operations', submenuId: 'planning' },
  clients: { menuId: 'operations', submenuId: 'people' },
  staff: { menuId: 'operations', submenuId: 'people' },
  activities: { menuId: 'operations', submenuId: 'activities' },
  history: { menuId: 'operations', submenuId: 'activities' },
  sales: { menuId: 'business', submenuId: 'sales' },
  stocks: { menuId: 'business', submenuId: 'inventory' },
  workflows: { menuId: 'business', submenuId: 'processes' },
  invoices: { menuId: 'finance', submenuId: 'billing' },
  reports: { menuId: 'analytics', submenuId: 'reports' },
  roles: { menuId: 'administration', submenuId: 'access' },
  permissions: { menuId: 'administration', submenuId: 'access' },
  userData: { menuId: 'administration', submenuId: 'users' }
};
