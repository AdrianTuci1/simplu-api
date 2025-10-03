# Frontend Implementation Guide - External API Configuration

Acest ghid explică cum să implementezi în meniul administrativ din frontend configurațiile pentru SMS și Email, unde utilizatorul configurează doar comportamentul (nu credentialele).

## 🎯 Conceptul

- **Utilizatorul NU gestionează credentialele SMS** (acestea sunt gestionate automat pe baza businessId-locationId)
- **Utilizatorul configurează doar**:
  - Când să trimită mesaje (la programare, reminder-uri)
  - Template-urile de mesaje
  - Comportamentul per locație

## 📱 Structura Meniului Administrativ

### 1. Locația în Meniu
```
Administrare
├── Setări Generale
├── Utilizatori
├── Programări
├── **Mesaje și Notificări** ← NOU
│   ├── Configurații SMS
│   ├── Configurații Email
│   └── Template-uri
└── Rapoarte
```

### 2. Structura Paginii de Configurare

```
📱 Mesaje și Notificări
├── 🔄 Selector Locație (dropdown)
├── 📋 Tabs
│   ├── Tab SMS
│   │   ├── ✅ Activează SMS
│   │   ├── 📅 Când trimite mesaje
│   │   │   ├── ☑️ La crearea programării
│   │   │   ├── ☑️ Reminder cu o zi înainte
│   │   │   └── ☑️ Reminder în ziua respectivă
│   │   ├── 📝 Template-uri SMS
│   │   └── 🔧 Setări avansate
│   └── Tab Email
│       ├── ✅ Activează Email
│       ├── 📅 Când trimite email-uri
│       │   ├── ☑️ La crearea programării
│       │   ├── ☑️ Reminder cu o zi înainte
│       │   └── ☑️ Reminder în ziua respectivă
│       ├── 📝 Template-uri Email
│       ├── 👤 Nume expeditor
│       └── 🔧 Setări avansate
└── 💾 Butoane salvare
```

## 🛠️ Implementare Frontend

### 1. Componente React/Next.js

#### Componenta Principală
```tsx
// components/admin/MessagesAndNotifications.tsx
import React, { useState, useEffect } from 'react';
import { Card, Tabs, Switch, Button, message } from 'antd';
import SMSConfiguration from './SMSConfiguration';
import EmailConfiguration from './EmailConfiguration';

interface MessagesConfigProps {
  businessId: string;
  locations: Array<{ id: string; name: string }>;
}

export default function MessagesAndNotifications({ businessId, locations }: MessagesConfigProps) {
  const [selectedLocationId, setSelectedLocationId] = useState<string>('default');
  const [smsConfig, setSmsConfig] = useState(null);
  const [emailConfig, setEmailConfig] = useState(null);
  const [loading, setLoading] = useState(false);

  // Încarcă configurația pentru locația selectată
  useEffect(() => {
    loadConfiguration();
  }, [selectedLocationId]);

  const loadConfiguration = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/external-api-config/${businessId}?locationId=${selectedLocationId}`
      );
      const config = await response.json();
      
      if (config.sms) setSmsConfig(config.sms);
      if (config.email) setEmailConfig(config.email);
    } catch (error) {
      console.error('Error loading configuration:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveConfiguration = async () => {
    try {
      setLoading(true);
      
      // Salvează configurația
      const response = await fetch(`/api/external-api-config/${businessId}?locationId=${selectedLocationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sms: smsConfig,
          email: emailConfig
        })
      });

      if (response.ok) {
        message.success('Configurația a fost salvată cu succes!');
      }
    } catch (error) {
      message.error('Eroare la salvarea configurației');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="messages-config">
      <Card title="Mesaje și Notificări" className="mb-6">
        {/* Selector Locație */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Locație:
          </label>
          <select 
            value={selectedLocationId}
            onChange={(e) => setSelectedLocationId(e.target.value)}
            className="w-full max-w-xs px-3 py-2 border rounded-md"
          >
            <option value="default">Configurație Generală</option>
            {locations.map(location => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        </div>

        {/* Tabs pentru SMS și Email */}
        <Tabs
          items={[
            {
              key: 'sms',
              label: '📱 SMS',
              children: (
                <SMSConfiguration
                  config={smsConfig}
                  onChange={setSmsConfig}
                  businessId={businessId}
                  locationId={selectedLocationId}
                />
              )
            },
            {
              key: 'email',
              label: '📧 Email',
              children: (
                <EmailConfiguration
                  config={emailConfig}
                  onChange={setEmailConfig}
                  businessId={businessId}
                  locationId={selectedLocationId}
                />
              )
            }
          ]}
        />

        {/* Butoane Salvare */}
        <div className="flex justify-end mt-6 space-x-2">
          <Button onClick={loadConfiguration} loading={loading}>
            Anulează
          </Button>
          <Button type="primary" onClick={saveConfiguration} loading={loading}>
            Salvează Configurația
          </Button>
        </div>
      </Card>
    </div>
  );
}
```

#### Componenta Configurație SMS
```tsx
// components/admin/SMSConfiguration.tsx
import React, { useState } from 'react';
import { Switch, Checkbox, Card, Button, Modal, Input, Select } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';

interface SMSConfig {
  enabled: boolean;
  sendOnBooking: boolean;
  sendReminder: boolean;
  reminderTiming: 'day_before' | 'same_day' | 'both';
  defaultTemplate: string;
  templates: Array<{
    id: string;
    name: string;
    content: string;
    variables: string[];
  }>;
}

interface SMSConfigurationProps {
  config: SMSConfig | null;
  onChange: (config: SMSConfig) => void;
  businessId: string;
  locationId: string;
}

export default function SMSConfiguration({ config, onChange, businessId, locationId }: SMSConfigurationProps) {
  const [templateModalVisible, setTemplateModalVisible] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

  // Configurație default
  const defaultConfig: SMSConfig = {
    enabled: false,
    sendOnBooking: false,
    sendReminder: false,
    reminderTiming: 'day_before',
    defaultTemplate: 'default',
    templates: [{
      id: 'default',
      name: 'Template Implicit',
      content: 'Salut {{patientName}}! Programarea ta la {{businessName}} este confirmată pentru {{appointmentDate}} la ora {{appointmentTime}}. Te așteptăm!',
      variables: ['patientName', 'businessName', 'appointmentDate', 'appointmentTime']
    }]
  };

  const currentConfig = config || defaultConfig;

  const updateConfig = (updates: Partial<SMSConfig>) => {
    onChange({ ...currentConfig, ...updates });
  };

  const addTemplate = () => {
    setEditingTemplate(null);
    setTemplateModalVisible(true);
  };

  const editTemplate = (template) => {
    setEditingTemplate(template);
    setTemplateModalVisible(true);
  };

  const deleteTemplate = (templateId: string) => {
    const updatedTemplates = currentConfig.templates.filter(t => t.id !== templateId);
    let defaultTemplate = currentConfig.defaultTemplate;
    
    if (defaultTemplate === templateId && updatedTemplates.length > 0) {
      defaultTemplate = updatedTemplates[0].id;
    }
    
    updateConfig({ templates: updatedTemplates, defaultTemplate });
  };

  return (
    <div className="sms-config">
      {/* Activare SMS */}
      <Card className="mb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Activare SMS</h3>
            <p className="text-gray-600">Activează trimiterea automată de mesaje SMS</p>
          </div>
          <Switch
            checked={currentConfig.enabled}
            onChange={(checked) => updateConfig({ enabled: checked })}
          />
        </div>

        {currentConfig.enabled && (
          <div className="space-y-4">
            {/* Când trimite mesaje */}
            <div>
              <h4 className="font-medium mb-2">Când trimite mesaje:</h4>
              <div className="space-y-2">
                <label className="flex items-center">
                  <Checkbox
                    checked={currentConfig.sendOnBooking}
                    onChange={(e) => updateConfig({ sendOnBooking: e.target.checked })}
                  />
                  <span className="ml-2">La crearea programării</span>
                </label>
                <label className="flex items-center">
                  <Checkbox
                    checked={currentConfig.sendReminder}
                    onChange={(e) => updateConfig({ sendReminder: e.target.checked })}
                  />
                  <span className="ml-2">Reminder</span>
                </label>
              </div>
            </div>

            {/* Timing pentru reminder */}
            {currentConfig.sendReminder && (
              <div>
                <h4 className="font-medium mb-2">Când trimite reminder:</h4>
                <Select
                  value={currentConfig.reminderTiming}
                  onChange={(value) => updateConfig({ reminderTiming: value })}
                  className="w-full max-w-xs"
                >
                  <Select.Option value="day_before">Cu o zi înainte</Select.Option>
                  <Select.Option value="same_day">În ziua respectivă</Select.Option>
                  <Select.Option value="both">Ambele</Select.Option>
                </Select>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Template-uri SMS */}
      {currentConfig.enabled && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Template-uri SMS</h3>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={addTemplate}
            >
              Adaugă Template
            </Button>
          </div>

          <div className="space-y-3">
            {currentConfig.templates.map(template => (
              <div key={template.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <h4 className="font-medium">{template.name}</h4>
                    {template.id === currentConfig.defaultTemplate && (
                      <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                        Implicit
                      </span>
                    )}
                  </div>
                  <div className="space-x-2">
                    <Button 
                      size="small" 
                      icon={<EditOutlined />}
                      onClick={() => editTemplate(template)}
                    />
                    {template.id !== 'default' && (
                      <Button 
                        size="small" 
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => deleteTemplate(template.id)}
                      />
                    )}
                  </div>
                </div>
                <p className="text-gray-600 text-sm">{template.content}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Modal pentru Template */}
      <TemplateModal
        visible={templateModalVisible}
        template={editingTemplate}
        onSave={(template) => {
          if (editingTemplate) {
            // Edit template
            const updatedTemplates = currentConfig.templates.map(t => 
              t.id === editingTemplate.id ? template : t
            );
            updateConfig({ templates: updatedTemplates });
          } else {
            // Add new template
            updateConfig({ 
              templates: [...currentConfig.templates, template] 
            });
          }
          setTemplateModalVisible(false);
        }}
        onCancel={() => setTemplateModalVisible(false)}
      />
    </div>
  );
}
```

#### Componenta Modal Template
```tsx
// components/admin/TemplateModal.tsx
import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Button, Select, message } from 'antd';

const TEMPLATE_VARIABLES = [
  { name: 'patientName', description: 'Numele pacientului' },
  { name: 'appointmentDate', description: 'Data programării' },
  { name: 'appointmentTime', description: 'Ora programării' },
  { name: 'businessName', description: 'Numele afacerii' },
  { name: 'locationName', description: 'Numele locației' },
  { name: 'serviceName', description: 'Numele serviciului' },
  { name: 'doctorName', description: 'Numele doctorului' },
  { name: 'phoneNumber', description: 'Numărul de telefon' }
];

interface TemplateModalProps {
  visible: boolean;
  template: any;
  onSave: (template: any) => void;
  onCancel: () => void;
}

export default function TemplateModal({ visible, template, onSave, onCancel }: TemplateModalProps) {
  const [form] = Form.useForm();
  const [selectedVariables, setSelectedVariables] = useState<string[]>([]);

  useEffect(() => {
    if (template) {
      form.setFieldsValue(template);
      setSelectedVariables(template.variables || []);
    } else {
      form.resetFields();
      setSelectedVariables([]);
    }
  }, [template, form]);

  const handleSave = () => {
    form.validateFields().then(values => {
      const newTemplate = {
        ...values,
        id: template?.id || `template_${Date.now()}`,
        variables: selectedVariables
      };
      onSave(newTemplate);
    });
  };

  const insertVariable = (variable: string) => {
    const currentContent = form.getFieldValue('content') || '';
    const newContent = currentContent + `{{${variable}}}`;
    form.setFieldsValue({ content: newContent });
  };

  return (
    <Modal
      title={template ? 'Editează Template' : 'Adaugă Template'}
      open={visible}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Anulează
        </Button>,
        <Button key="save" type="primary" onClick={handleSave}>
          Salvează
        </Button>
      ]}
      width={800}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="name"
          label="Nume Template"
          rules={[{ required: true, message: 'Introduceți numele template-ului' }]}
        >
          <Input placeholder="Ex: Confirmare programare" />
        </Form.Item>

        <Form.Item
          name="content"
          label="Conținut Mesaj"
          rules={[{ required: true, message: 'Introduceți conținutul mesajului' }]}
        >
          <Input.TextArea 
            rows={4} 
            placeholder="Ex: Salut {{patientName}}! Programarea ta la {{businessName}} este confirmată pentru {{appointmentDate}} la ora {{appointmentTime}}."
          />
        </Form.Item>

        {/* Variabile disponibile */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Variabile disponibile:</label>
          <div className="grid grid-cols-2 gap-2">
            {TEMPLATE_VARIABLES.map(variable => (
              <Button
                key={variable.name}
                size="small"
                onClick={() => insertVariable(variable.name)}
                className="text-left justify-start"
              >
                {variable.name}
              </Button>
            ))}
          </div>
        </div>

        <Form.Item label="Variabile folosite">
          <Select
            mode="multiple"
            value={selectedVariables}
            onChange={setSelectedVariables}
            placeholder="Selectați variabilele folosite"
          >
            {TEMPLATE_VARIABLES.map(variable => (
              <Select.Option key={variable.name} value={variable.name}>
                {variable.name} - {variable.description}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  );
}
```

### 2. API Routes (Next.js)

```typescript
// pages/api/external-api-config/[businessId].ts
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { businessId } = req.query;
  const locationId = req.query.locationId as string;

  const AI_AGENT_URL = process.env.AI_AGENT_SERVER_URL;

  try {
    switch (req.method) {
      case 'GET':
        // Obține configurația
        const getResponse = await fetch(
          `${AI_AGENT_URL}/external-api-config/${businessId}?locationId=${locationId}`
        );
        const config = await getResponse.json();
        res.status(200).json(config);
        break;

      case 'PUT':
        // Actualizează configurația
        const putResponse = await fetch(
          `${AI_AGENT_URL}/external-api-config/${businessId}?locationId=${locationId}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
          }
        );
        const updatedConfig = await putResponse.json();
        res.status(200).json(updatedConfig);
        break;

      case 'POST':
        // Creează configurație nouă
        const postResponse = await fetch(
          `${AI_AGENT_URL}/external-api-config`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              businessId,
              locationId,
              ...req.body
            })
          }
        );
        const newConfig = await postResponse.json();
        res.status(201).json(newConfig);
        break;

      default:
        res.setHeader('Allow', ['GET', 'PUT', 'POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
```

### 3. Integrare cu App Server

Când se creează o programare în app server, trimite automat mesajele:

```typescript
// În app server - când se creează o programare
async function createAppointment(appointmentData: any) {
  // Salvează programarea în baza de date
  const appointment = await saveAppointment(appointmentData);
  
  // Trimite mesaje automate
  await sendAutomatedMessages(appointment);
  
  return appointment;
}

async function sendAutomatedMessages(appointment: any) {
  try {
    const messageData = {
      patientName: appointment.patientName,
      patientPhone: appointment.patientPhone,
      patientEmail: appointment.patientEmail,
      appointmentDate: formatDate(appointment.date),
      appointmentTime: formatTime(appointment.time),
      businessName: appointment.business.name,
      locationName: appointment.location?.name,
      serviceName: appointment.serviceName,
      doctorName: appointment.doctorName,
      phoneNumber: appointment.business.phoneNumber
    };

    // Trimite către ai-agent-server
    await fetch(`${process.env.AI_AGENT_SERVER_URL}/message-automation/${appointment.businessId}/send-booking-confirmation?locationId=${appointment.locationId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messageData)
    });
  } catch (error) {
    console.error('Error sending automated messages:', error);
  }
}
```

## 🎨 Design UI/UX

### Culoare și Stiluri
- **Verde** pentru SMS activat
- **Albastru** pentru Email activat  
- **Gri** pentru servicii dezactivate
- **Icons** pentru fiecare tip de mesaj
- **Preview** în timp real pentru template-uri

### Responsive Design
- Mobile-first approach
- Tabs responsive pe mobile
- Template editor adaptat pentru touch

## 🔐 Securitate

- **Validare** input-uri pe frontend și backend
- **Sanitizare** template-uri pentru prevenirea XSS
- **Rate limiting** pentru API calls
- **Authentication** pentru toate endpoint-urile

## 📊 Analytics și Monitoring

- **Tracking** pentru mesaje trimise
- **Success rate** pentru fiecare canal
- **Error logging** pentru debugging
- **Usage statistics** per business/location

Acest ghid oferă o implementare completă pentru frontend care permite utilizatorilor să configureze comportamentul mesajelor fără să gestioneze credentialele tehnice.
