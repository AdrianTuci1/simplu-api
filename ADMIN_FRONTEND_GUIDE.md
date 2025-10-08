# Admin Frontend Guide

## Overview
Ghid pentru implementarea frontend-ului admin care permite vizualizarea și gestionarea tuturor business-urilor din sistem.

## API Endpoints Disponibile

### 1. Lista tuturor business-urilor (Admin)
```
GET /businesses/admin
Authorization: Bearer <token>
```
**Răspuns:**
```json
[
  {
    "businessId": "biz-123",
    "companyName": "Clinica Dentală ABC",
    "businessType": "dental",
    "subscriptionType": "solo",
    "status": "active",
    "paymentStatus": "active",
    "ownerEmail": "owner@example.com",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z",
    "locations": [
      {
        "id": "loc-1",
        "name": "Clinica Centrală",
        "address": "Strada Principală 123",
        "active": true
      }
    ],
    "credits": {
      "total": 1000,
      "available": 800,
      "currency": "RON"
    }
  }
]
```

### 2. Launch Business (Admin)
```
POST /businesses/:id/launch
Content-Type: application/json

{
  "secretCode": "LAUNCH_SECRET_2024"
}
```
**Răspuns:**
```json
{
  "businessId": "biz-123",
  "companyName": "Clinica Dentală ABC",
  "status": "active",
  "paymentStatus": "active",
  "active": true,
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

### 3. Informații utilizator curent
```
GET /auth/profile
Authorization: Bearer <token>
```
**Răspuns:**
```json
{
  "success": true,
  "user": {
    "userId": "user-123",
    "email": "admin@example.com",
    "firstName": "Admin",
    "lastName": "User",
    "groups": ["admin"]
  }
}
```

## Componente React Recomandate

### 1. Admin Dashboard
```typescript
// components/admin/AdminDashboard.tsx
import React, { useState, useEffect } from 'react';
import { BusinessList } from './BusinessList';
import { BusinessStats } from './BusinessStats';
import { AdminHeader } from './AdminHeader';

export const AdminDashboard: React.FC = () => {
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBusinesses();
  }, []);

  const fetchBusinesses = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/businesses/admin', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Nu aveți permisiuni de admin');
        }
        throw new Error('Eroare la încărcarea business-urilor');
      }

      const data = await response.json();
      setBusinesses(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Se încarcă...</div>;
  if (error) return <div className="error">Eroare: {error}</div>;

  return (
    <div className="admin-dashboard">
      <AdminHeader />
      <BusinessStats businesses={businesses} />
      <BusinessList businesses={businesses} onRefresh={fetchBusinesses} />
    </div>
  );
};
```

### 2. Lista Business-urilor
```typescript
// components/admin/BusinessList.tsx
import React, { useState } from 'react';

interface Business {
  businessId: string;
  companyName: string;
  businessType: string;
  subscriptionType: 'solo' | 'enterprise';
  status: 'active' | 'suspended' | 'configured';
  paymentStatus: 'active' | 'past_due' | 'canceled' | 'unpaid';
  ownerEmail: string;
  createdAt: string;
  updatedAt: string;
  locations: Array<{
    id: string;
    name: string;
    address: string;
    active: boolean;
  }>;
  credits: {
    total: number;
    available: number;
    currency: string;
  };
}

interface BusinessListProps {
  businesses: Business[];
  onRefresh: () => void;
}

interface LaunchBusinessModalProps {
  business: Business | null;
  isOpen: boolean;
  onClose: () => void;
  onLaunch: (businessId: string, secretCode: string) => Promise<void>;
}

export const BusinessList: React.FC<BusinessListProps> = ({ businesses, onRefresh }) => {
  const [filter, setFilter] = useState<'all' | 'active' | 'suspended' | 'configured'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [launchModal, setLaunchModal] = useState<{ isOpen: boolean; business: Business | null }>({
    isOpen: false,
    business: null
  });
  const [launching, setLaunching] = useState<string | null>(null);

  const filteredBusinesses = businesses.filter(business => {
    const matchesFilter = filter === 'all' || business.status === filter;
    const matchesSearch = business.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         business.ownerEmail.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleLaunch = async (businessId: string, secretCode: string) => {
    try {
      setLaunching(businessId);
      const token = localStorage.getItem('accessToken');
      
      const response = await fetch(`/api/businesses/${businessId}/launch`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ secretCode })
      });

      if (!response.ok) {
        throw new Error('Eroare la lansarea business-ului');
      }

      // Refresh lista după launch
      await onRefresh();
      setLaunchModal({ isOpen: false, business: null });
      
      alert('Business lansat cu succes!');
    } catch (error) {
      alert(`Eroare: ${error.message}`);
    } finally {
      setLaunching(null);
    }
  };

  const openLaunchModal = (business: Business) => {
    setLaunchModal({ isOpen: true, business });
  };

  const closeLaunchModal = () => {
    setLaunchModal({ isOpen: false, business: null });
  };

  const getStatusBadge = (status: string, paymentStatus: string) => {
    if (status === 'active' && paymentStatus === 'active') {
      return <span className="badge badge-success">Activ</span>;
    } else if (status === 'suspended') {
      return <span className="badge badge-danger">Suspendat</span>;
    } else if (status === 'configured') {
      return <span className="badge badge-warning">Configurat</span>;
    } else if (paymentStatus === 'past_due') {
      return <span className="badge badge-warning">Plată întârziată</span>;
    }
    return <span className="badge badge-secondary">{status}</span>;
  };

  const canLaunch = (business: Business) => {
    return business.status === 'configured' || business.status === 'suspended';
  };

  return (
    <div className="business-list">
      <div className="business-list-header">
        <h2>Business-uri ({filteredBusinesses.length})</h2>
        
        <div className="business-list-controls">
          <input
            type="text"
            placeholder="Căutare după nume sau email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          
          <select value={filter} onChange={(e) => setFilter(e.target.value as any)}>
            <option value="all">Toate</option>
            <option value="active">Active</option>
            <option value="suspended">Suspendate</option>
            <option value="configured">Configurate</option>
          </select>
          
          <button onClick={onRefresh} className="btn btn-secondary">
            Refresh
          </button>
        </div>
      </div>

      <div className="business-table-container">
        <table className="business-table">
          <thead>
            <tr>
              <th>Nume Companie</th>
              <th>Tip</th>
              <th>Abonament</th>
              <th>Status</th>
              <th>Email Owner</th>
              <th>Locații</th>
              <th>Credite</th>
              <th>Creat</th>
              <th>Acțiuni</th>
            </tr>
          </thead>
          <tbody>
            {filteredBusinesses.map((business) => (
              <tr key={business.businessId}>
                <td>
                  <div className="business-name">
                    <strong>{business.companyName}</strong>
                    <small>ID: {business.businessId}</small>
                  </div>
                </td>
                <td>
                  <span className="business-type">
                    {business.businessType === 'dental' ? 'Dental' : 
                     business.businessType === 'gym' ? 'Sala Sport' : 
                     business.businessType === 'hotel' ? 'Hotel' : business.businessType}
                  </span>
                </td>
                <td>
                  <span className="subscription-type">
                    {business.subscriptionType === 'solo' ? 'Solo' : 'Enterprise'}
                  </span>
                </td>
                <td>{getStatusBadge(business.status, business.paymentStatus)}</td>
                <td>{business.ownerEmail}</td>
                <td>
                  <div className="locations-info">
                    <span className="location-count">{business.locations.length} locații</span>
                    {business.locations.map((loc, index) => (
                      <div key={loc.id} className="location-item">
                        <small>{loc.name}</small>
                      </div>
                    ))}
                  </div>
                </td>
                <td>
                  <div className="credits-info">
                    <span className="credits-available">
                      {business.credits.available} / {business.credits.total}
                    </span>
                    <small>{business.credits.currency}</small>
                  </div>
                </td>
                <td>
                  <div className="date-info">
                    <small>{new Date(business.createdAt).toLocaleDateString('ro-RO')}</small>
                  </div>
                </td>
                <td>
                  <div className="action-buttons">
                    <button 
                      className="btn btn-sm btn-primary"
                      onClick={() => window.open(`/business/${business.businessId}`, '_blank')}
                    >
                      Vezi
                    </button>
                    {canLaunch(business) && (
                      <button 
                        className="btn btn-sm btn-success"
                        onClick={() => openLaunchModal(business)}
                        disabled={launching === business.businessId}
                      >
                        {launching === business.businessId ? 'Lansează...' : 'Launch'}
                      </button>
                    )}
                    <button 
                      className="btn btn-sm btn-secondary"
                      onClick={() => console.log('Edit business:', business.businessId)}
                    >
                      Edit
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Launch Modal */}
      <LaunchBusinessModal
        business={launchModal.business}
        isOpen={launchModal.isOpen}
        onClose={closeLaunchModal}
        onLaunch={handleLaunch}
      />
    </div>
  );
};

// Launch Business Modal Component
export const LaunchBusinessModal: React.FC<LaunchBusinessModalProps> = ({
  business,
  isOpen,
  onClose,
  onLaunch
}) => {
  const [secretCode, setSecretCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business || !secretCode.trim()) return;

    try {
      setLoading(true);
      await onLaunch(business.businessId, secretCode.trim());
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSecretCode('');
    onClose();
  };

  if (!isOpen || !business) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Lansează Business</h3>
          <button className="modal-close" onClick={handleClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="business-info">
            <h4>{business.companyName}</h4>
            <p><strong>ID:</strong> {business.businessId}</p>
            <p><strong>Email Owner:</strong> {business.ownerEmail}</p>
            <p><strong>Status curent:</strong> {business.status}</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="secretCode">Secret Code:</label>
              <input
                type="text"
                id="secretCode"
                value={secretCode}
                onChange={(e) => setSecretCode(e.target.value)}
                placeholder="Introduceți secret code-ul"
                required
                className="form-input"
              />
              <small className="form-help">
                Secret code-ul necesar pentru a lansa business-ul
              </small>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                onClick={handleClose}
                className="btn btn-secondary"
                disabled={loading}
              >
                Anulează
              </button>
              <button
                type="submit"
                className="btn btn-success"
                disabled={loading || !secretCode.trim()}
              >
                {loading ? 'Lansează...' : 'Lansează Business'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
```

### 3. Statistici Business
```typescript
// components/admin/BusinessStats.tsx
import React from 'react';

interface Business {
  businessId: string;
  status: 'active' | 'suspended' | 'configured';
  paymentStatus: 'active' | 'past_due' | 'canceled' | 'unpaid';
  businessType: string;
  subscriptionType: 'solo' | 'enterprise';
}

interface BusinessStatsProps {
  businesses: Business[];
}

export const BusinessStats: React.FC<BusinessStatsProps> = ({ businesses }) => {
  const stats = {
    total: businesses.length,
    active: businesses.filter(b => b.status === 'active' && b.paymentStatus === 'active').length,
    suspended: businesses.filter(b => b.status === 'suspended').length,
    configured: businesses.filter(b => b.status === 'configured').length,
    pastDue: businesses.filter(b => b.paymentStatus === 'past_due').length,
    dental: businesses.filter(b => b.businessType === 'dental').length,
    gym: businesses.filter(b => b.businessType === 'gym').length,
    hotel: businesses.filter(b => b.businessType === 'hotel').length,
    solo: businesses.filter(b => b.subscriptionType === 'solo').length,
    enterprise: businesses.filter(b => b.subscriptionType === 'enterprise').length,
  };

  return (
    <div className="business-stats">
      <h2>Statistici</h2>
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Business-uri</h3>
          <div className="stat-number">{stats.total}</div>
        </div>
        
        <div className="stat-card">
          <h3>Active</h3>
          <div className="stat-number stat-success">{stats.active}</div>
        </div>
        
        <div className="stat-card">
          <h3>Suspendate</h3>
          <div className="stat-number stat-danger">{stats.suspended}</div>
        </div>
        
        <div className="stat-card">
          <h3>Configurate</h3>
          <div className="stat-number stat-warning">{stats.configured}</div>
        </div>
        
        <div className="stat-card">
          <h3>Plăți Întârziate</h3>
          <div className="stat-number stat-warning">{stats.pastDue}</div>
        </div>
        
        <div className="stat-card">
          <h3>Dental</h3>
          <div className="stat-number">{stats.dental}</div>
        </div>
        
        <div className="stat-card">
          <h3>Sala Sport</h3>
          <div className="stat-number">{stats.gym}</div>
        </div>
        
        <div className="stat-card">
          <h3>Hotel</h3>
          <div className="stat-number">{stats.hotel}</div>
        </div>
        
        <div className="stat-card">
          <h3>Solo</h3>
          <div className="stat-number">{stats.solo}</div>
        </div>
        
        <div className="stat-card">
          <h3>Enterprise</h3>
          <div className="stat-number">{stats.enterprise}</div>
        </div>
      </div>
    </div>
  );
};
```

### 4. Header Admin
```typescript
// components/admin/AdminHeader.tsx
import React, { useState, useEffect } from 'react';

interface User {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  groups: string[];
}

export const AdminHeader: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    fetchUserInfo();
  }, []);

  const fetchUserInfo = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/auth/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      }
    } catch (error) {
      console.error('Error fetching user info:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    window.location.href = '/login';
  };

  return (
    <header className="admin-header">
      <div className="admin-header-content">
        <h1>Admin Panel</h1>
        <div className="admin-user-info">
          {user && (
            <div className="user-details">
              <span>Bună, {user.firstName} {user.lastName}</span>
              <span className="user-email">({user.email})</span>
              {user.groups?.includes('admin') && (
                <span className="admin-badge">Admin</span>
              )}
            </div>
          )}
          <button onClick={handleLogout} className="btn btn-outline">
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};
```

## CSS Styling Recomandat

```css
/* styles/admin.css */
.admin-dashboard {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.admin-header {
  background: #fff;
  border-bottom: 1px solid #e0e0e0;
  padding: 15px 0;
  margin-bottom: 30px;
}

.admin-header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 20px;
}

.admin-user-info {
  display: flex;
  align-items: center;
  gap: 15px;
}

.user-details {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  font-size: 14px;
}

.admin-badge {
  background: #28a745;
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
}

.business-stats {
  margin-bottom: 30px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.stat-card {
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.stat-number {
  font-size: 2rem;
  font-weight: bold;
  margin-top: 10px;
}

.stat-success { color: #28a745; }
.stat-danger { color: #dc3545; }
.stat-warning { color: #ffc107; }

.business-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 15px;
}

.business-list-controls {
  display: flex;
  gap: 10px;
  align-items: center;
}

.search-input {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  min-width: 250px;
}

.business-table-container {
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.business-table {
  width: 100%;
  border-collapse: collapse;
}

.business-table th,
.business-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #e0e0e0;
}

.business-table th {
  background: #f8f9fa;
  font-weight: 600;
}

.business-name strong {
  display: block;
  margin-bottom: 4px;
}

.business-name small {
  color: #666;
  font-size: 12px;
}

.badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.badge-success { background: #d4edda; color: #155724; }
.badge-danger { background: #f8d7da; color: #721c24; }
.badge-warning { background: #fff3cd; color: #856404; }
.badge-secondary { background: #e2e3e5; color: #383d41; }

.locations-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.location-item {
  font-size: 12px;
  color: #666;
}

.credits-info {
  text-align: center;
}

.credits-available {
  font-weight: 600;
  display: block;
}

.date-info {
  font-size: 12px;
  color: #666;
}

.action-buttons {
  display: flex;
  gap: 5px;
}

.btn {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  text-decoration: none;
  display: inline-block;
  text-align: center;
}

.btn-primary { background: #007bff; color: white; }
.btn-secondary { background: #6c757d; color: white; }
.btn-success { background: #28a745; color: white; }
.btn-outline { background: transparent; border: 1px solid #007bff; color: #007bff; }
.btn-sm { padding: 4px 8px; font-size: 11px; }

.btn:hover {
  opacity: 0.9;
}

.error {
  background: #f8d7da;
  color: #721c24;
  padding: 15px;
  border-radius: 4px;
  margin: 20px 0;
}

@media (max-width: 768px) {
  .business-table-container {
    overflow-x: auto;
  }
  
  .business-list-header {
    flex-direction: column;
    align-items: stretch;
  }
  
  .business-list-controls {
    flex-wrap: wrap;
  }
  
  .search-input {
    min-width: 100%;
  }
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;
}

.modal-header h3 {
  margin: 0;
  color: #333;
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-close:hover {
  color: #333;
}

.modal-body {
  padding: 20px;
}

.business-info {
  background: #f8f9fa;
  border-radius: 6px;
  padding: 15px;
  margin-bottom: 20px;
}

.business-info h4 {
  margin: 0 0 10px 0;
  color: #333;
}

.business-info p {
  margin: 5px 0;
  font-size: 14px;
  color: #666;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
  color: #333;
}

.form-input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  box-sizing: border-box;
}

.form-input:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.form-help {
  display: block;
  margin-top: 5px;
  font-size: 12px;
  color: #666;
}

.modal-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 20px;
}

.modal-actions .btn {
  padding: 10px 20px;
  font-size: 14px;
}
```

## Implementare

1. **Creați componentele** în folderul `src/components/admin/`
2. **Adăugați CSS-ul** în `src/styles/admin.css`
3. **Configurați ruta** pentru admin panel în router
4. **Adăugați verificarea de admin** în componenta principală
5. **Configurați token-ul** din localStorage pentru autentificare

## Verificare Admin

Înainte de a afișa admin panel-ul, verificați dacă utilizatorul este admin:

```typescript
// utils/adminCheck.ts
export const isAdmin = (user: any): boolean => {
  return user?.groups?.includes('admin') || user?.groups?.includes('Admin');
};

// În componenta principală
const [user, setUser] = useState(null);

useEffect(() => {
  fetchUserInfo().then(userData => {
    setUser(userData);
    if (!isAdmin(userData)) {
      window.location.href = '/unauthorized';
    }
  });
}, []);
```

Această implementare vă oferă un admin panel complet pentru gestionarea business-urilor!
