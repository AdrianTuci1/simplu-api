# Configurare Tabel DynamoDB pentru Business Subscriptions

## Prezentare Generală

Tabelul `business-subscriptions` trebuie configurat corect pentru a permite căutări eficiente atât după `businessId` cât și după `subscriptionId`.

## Structura Tabelului

### Tabelul Principal: `business-subscriptions`

| Câmp | Tip | Descriere |
|------|-----|-----------|
| `id` | String | **Primary Key** - Format: `business#${businessId}` |
| `businessId` | String | ID-ul business-ului |
| `subscriptionId` | String | ID-ul abonamentului Stripe |
| `customerId` | String | ID-ul clientului Stripe |
| `priceId` | String | ID-ul prețului Stripe |
| `status` | String | Statusul abonamentului (active, past_due, etc.) |

### Global Secondary Index (GSI): `subscriptionId-index`

| Câmp | Tip | Descriere |
|------|-----|-----------|
| `subscriptionId` | String | **Partition Key** - ID-ul abonamentului Stripe |

## Configurare în AWS Console

### 1. Creează Tabelul

1. Mergi la **DynamoDB Console**
2. Click **Create table**
3. Configurează:
   - **Table name**: `business-subscriptions`
   - **Partition key**: `id` (String)
   - **Sort key**: (lasă gol)

### 2. Adaugă GSI

1. În tabelul creat, mergi la tab-ul **Indexes**
2. Click **Create index**
3. Configurează:
   - **Index name**: `subscriptionId-index`
   - **Partition key**: `subscriptionId` (String)
   - **Sort key**: (lasă gol)

### 3. Configurare CloudFormation (Opțional)

```yaml
Resources:
  BusinessSubscriptionsTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: business-subscriptions
      AttributeDefinitions:
        - AttributeName: id
          AttributeType: S
        - AttributeName: subscriptionId
          AttributeType: S
      KeySchema:
        - AttributeName: id
          KeyType: HASH
      GlobalSecondaryIndexes:
        - IndexName: subscriptionId-index
          KeySchema:
            - AttributeName: subscriptionId
              KeyType: HASH
          Projection:
            ProjectionType: ALL
      BillingMode: PAY_PER_REQUEST
      SSESpecification:
        SSEEnabled: true
```

## Configurare prin AWS CLI

### 1. Creează Tabelul Principal

```bash
aws dynamodb create-table \
  --table-name business-subscriptions \
  --attribute-definitions AttributeName=id,AttributeType=S \
  --key-schema AttributeName=id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST
```

### 2. Adaugă GSI

```bash
aws dynamodb update-table \
  --table-name business-subscriptions \
  --attribute-definitions AttributeName=subscriptionId,AttributeType=S \
  --global-secondary-index-updates \
    "[{\"Create\":{\"IndexName\":\"subscriptionId-index\",\"KeySchema\":[{\"AttributeName\":\"subscriptionId\",\"KeyType\":\"HASH\"}],\"Projection\":{\"ProjectionType\":\"ALL\"}}}]"
```

## Exemple de Date

### Exemplu de Înregistrare

```json
{
  "id": "business#123e4567-e89b-12d3-a456-426614174000",
  "businessId": "123e4567-e89b-12d3-a456-426614174000",
  "subscriptionId": "sub_1ABC123DEF456",
  "customerId": "cus_1XYZ789ABC123",
  "priceId": "price_basic_monthly",
  "status": "active"
}
```

### Căutări Suportate

#### 1. După Business ID (Primary Key)
```javascript
// În SubscriptionStoreService
await this.getSubscriptionForBusiness("123e4567-e89b-12d3-a456-426614174000");
```

#### 2. După Subscription ID (GSI)
```javascript
// În SubscriptionStoreService
await this.findBusinessBySubscriptionId("sub_1ABC123DEF456");
```

## Variabile de Mediu

Asigură-te că ai configurat:

```bash
# În .env
DYNAMODB_SUBSCRIPTIONS_TABLE_NAME=business-subscriptions
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
```

## Testare

### 1. Testează Căutarea după Business ID

```javascript
const subscription = await subscriptionStore.getSubscriptionForBusiness("business-id");
console.log(subscription);
```

### 2. Testează Căutarea după Subscription ID

```javascript
const businessId = await subscriptionStore.findBusinessBySubscriptionId("sub_123");
console.log(businessId);
```

### 3. Testează Salvarea

```javascript
await subscriptionStore.setSubscriptionForBusiness("business-id", {
  businessId: "business-id",
  subscriptionId: "sub_123",
  customerId: "cus_456",
  priceId: "price_789",
  status: "active"
});
```

## Monitorizare

### CloudWatch Metrics

Monitorizează:
- **ConsumedReadCapacityUnits**: Pentru căutări
- **ConsumedWriteCapacityUnits**: Pentru salvări
- **ThrottledRequests**: Pentru limitări

### Logs

Verifică logs-urile pentru:
- Erori de conectare la DynamoDB
- Avertismente despre folosirea scan-ului în loc de GSI
- Erori de validare a datelor

## Migrare de la Sistemul Vechi

### 1. Backup Date Existente

```bash
aws dynamodb scan \
  --table-name business-subscriptions \
  --output json > backup.json
```

### 2. Creează Tabelul Nou

Urmează pașii de configurare de mai sus.

### 3. Migrează Datele

```javascript
// Script de migrare
const oldData = require('./backup.json');
for (const item of oldData.Items) {
  await subscriptionStore.setSubscriptionForBusiness(
    item.businessId, 
    {
      businessId: item.businessId,
      subscriptionId: item.subscriptionId,
      customerId: item.customerId,
      priceId: item.priceId,
      status: item.status
    }
  );
}
```

## Troubleshooting

### Eroare: "GSI not found"

Dacă vezi acest avertisment în logs, înseamnă că GSI-ul nu este creat. Creează-l folosind pașii de mai sus.

### Eroare: "ValidationException"

Verifică că:
- Numele tabelului este corect
- Tipurile de date sunt corecte
- Cheile primare sunt definite corect

### Performanță Slabă

Dacă căutările sunt lente:
1. Verifică că GSI-ul este creat
2. Monitorizează CloudWatch metrics
3. Consideră optimizarea query-urilor

## Securitate

### IAM Permissions

Asigură-te că rolul AWS are permisiunile necesare:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      "Resource": [
        "arn:aws:dynamodb:*:*:table/business-subscriptions",
        "arn:aws:dynamodb:*:*:table/business-subscriptions/index/*"
      ]
    }
  ]
}
``` 