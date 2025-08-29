# WebSocket Client Connection Guide

## Overview
Acest ghid explică cum să te conectezi la serverul WebSocket Elixir pentru a primi notificări în timp real despre resurse.

## URL-ul de conectare
```
ws://localhost:4000/socket/websocket
```

## Structura canalelor (Channels)

### Canal pentru resurse specifice business-location
```
resources:{businessId}-{locationId}
```
Exemplu: `resources:B0100001-L0100001`

### Canal pentru întregul business
```
resources:{businessId}
```
Exemplu: `resources:B0100001`

## Exemplu de client JavaScript

```javascript
// Conectare la WebSocket
const socket = new WebSocket('ws://localhost:4000/socket/websocket');

socket.onopen = function(event) {
    console.log('Conectat la WebSocket server');
    
    // Join la canalul pentru business-location specific
    const channel = socket.channel('resources:B0100001-L0100001');
    
    channel.join()
        .receive('ok', resp => {
            console.log('Conectat la canalul resources:', resp);
        })
        .receive('error', resp => {
            console.log('Eroare la conectarea la canal:', resp);
        });
    
    // Ascultă pentru evenimente resource_update
    channel.on('resource_update', payload => {
        console.log('Primit update resursă:', payload);
        
        // Aici poți procesa datele primite
        const { type, data, businessId, locationId, resourceId, resourceType } = payload;
        
        switch(type) {
            case 'resource_created':
                console.log('Resursă nouă creată:', data);
                break;
            case 'resource_updated':
                console.log('Resursă actualizată:', data);
                break;
            case 'resource_deleted':
                console.log('Resursă ștearsă:', resourceId);
                break;
        }
    });
};

socket.onmessage = function(event) {
    console.log('Mesaj primit:', event.data);
};

socket.onerror = function(error) {
    console.error('Eroare WebSocket:', error);
};

socket.onclose = function(event) {
    console.log('Conexiune închisă:', event.code, event.reason);
};
```

## Exemplu cu Phoenix Socket (recomandat)

```javascript
import { Socket } from "phoenix"

// Creează conexiunea socket
const socket = new Socket("/socket", {
    params: { token: window.userToken }
});

// Conectează-te
socket.connect();

// Join la canalul pentru resurse
const channel = socket.channel(`resources:B0100001-L0100001`, {});

channel.join()
    .receive("ok", resp => {
        console.log("Conectat la canalul resources:", resp);
    })
    .receive("error", resp => {
        console.log("Eroare la conectarea la canal:", resp);
    });

// Ascultă pentru evenimente
channel.on("resource_update", payload => {
    console.log("Update resursă primit:", payload);
    
    // Procesează datele în funcție de tipul evenimentului
    const { type, data, businessId, locationId, resourceId, resourceType } = payload;
    
    // Aici poți actualiza UI-ul sau face alte acțiuni
    updateUI(payload);
});

function updateUI(payload) {
    switch(payload.type) {
        case 'resource_created':
            // Adaugă resursa nouă în listă
            addResourceToList(payload.data);
            break;
        case 'resource_updated':
            // Actualizează resursa în listă
            updateResourceInList(payload.data);
            break;
        case 'resource_deleted':
            // Șterge resursa din listă
            removeResourceFromList(payload.resourceId);
            break;
    }
}
```

## Structura datelor primite

Când primești un eveniment `resource_update`, payload-ul va avea următoarea structură:

```json
{
    "type": "resource_created",
    "businessId": "B0100001",
    "locationId": "L0100001",
    "resourceId": "pa2508-00004",
    "resourceType": "patient",
    "shardId": null,
    "timestamp": "2025-08-27T18:26:49.447Z",
    "data": {
        "id": "pa2508-00004",
        "patientName": "Sorin Enache",
        "email": "sorin.enache@test.com",
        "phone": "0799999999",
        "address": "Bucuresti",
        "birthYear": 1995,
        "gender": "male",
        "status": "active",
        "businessId": "B0100001",
        "locationId": "L0100001",
        "createdAt": "2025-08-27T18:26:49.386Z",
        "updatedAt": "2025-08-27T18:26:47.625Z",
        "startDate": null,
        "endDate": null,
        "notes": null,
        "tags": []
    }
}
```

## Tipuri de evenimente

- `resource_created` - Când o resursă nouă este creată
- `resource_updated` - Când o resursă existentă este actualizată
- `resource_deleted` - Când o resursă este ștearsă

## Testare

Pentru a testa conexiunea, poți folosi fișierul HTML de test:

```bash
# Deschide în browser
open http://localhost:4000/test-client.html
```

Sau poți folosi un client WebSocket online precum:
- https://www.piesocket.com/websocket-tester
- https://websocket.org/echo.html

## Debugging

Pentru a vedea logurile serverului, verifică output-ul din terminal unde rulează aplicația Elixir:

```bash
# În terminalul unde rulează serverul Elixir
mix phx.server
```

Logurile vor arăta:
- Când un client se conectează la un canal
- Când se face broadcast de evenimente
- Când se trimit datele către client

## Note importante

1. **CORS**: Serverul are CORS configurat pentru dezvoltare
2. **Reconectare**: Phoenix Socket se va reconecta automat în caz de deconectare
3. **Heartbeat**: Phoenix trimite automat ping-uri pentru a menține conexiunea
4. **Presence**: Poți folosi Phoenix Presence pentru a ști cine este conectat

## Exemplu complet de integrare

```html
<!DOCTYPE html>
<html>
<head>
    <title>WebSocket Test Client</title>
    <script src="https://cdn.jsdelivr.net/npm/phoenix@1.6.0/priv/static/phoenix.js"></script>
</head>
<body>
    <h1>WebSocket Test Client</h1>
    <div id="status">Deconectat</div>
    <div id="messages"></div>

    <script>
        const socket = new Socket("/socket", {});
        socket.connect();

        const channel = socket.channel("resources:B0100001-L0100001", {});
        
        channel.join()
            .receive("ok", resp => {
                document.getElementById('status').textContent = 'Conectat';
                addMessage('Conectat la canalul resources');
            })
            .receive("error", resp => {
                document.getElementById('status').textContent = 'Eroare';
                addMessage('Eroare la conectare: ' + JSON.stringify(resp));
            });

        channel.on("resource_update", payload => {
            addMessage('Update resursă: ' + JSON.stringify(payload, null, 2));
        });

        function addMessage(text) {
            const div = document.createElement('div');
            div.textContent = new Date().toLocaleTimeString() + ': ' + text;
            document.getElementById('messages').appendChild(div);
        }
    </script>
</body>
</html>
```
