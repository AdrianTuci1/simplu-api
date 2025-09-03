# AI Agent Server - Docker Setup

## 🐳 **Overview**
Acest ghid explică cum să construiești, rulezi și gestionezi AI Agent Server folosind Docker.

## 🚀 **Quick Start**

### **1. Build și Deploy Rapid**
```bash
# Build image și deploy container într-un singur comand
./docker-build.sh build-deploy

# Verifică status-ul
./docker-build.sh status

# Vezi logs
./docker-build.sh logs
```

### **2. Build Individual**
```bash
# Doar build image
./docker-build.sh build

# Doar deploy container (necesită image existent)
./docker-build.sh deploy
```

## 🏗️ **Dockerfile Features**

### **Multi-stage Build**
- **Builder Stage**: Compilează TypeScript și instalează dependențele
- **Production Stage**: Image optimizat pentru producție
- **Development Stage**: Image pentru dezvoltare cu hot-reload

### **Security Features**
- **Non-root User**: Rulează ca user `nestjs` (UID 1001)
- **Minimal Base Image**: Node.js 18 Alpine pentru dimensiune redusă
- **Health Checks**: Verificări automate de sănătate

### **Optimizations**
- **Layer Caching**: Optimizat pentru cache-ul Docker
- **Production Dependencies**: Doar dependențele necesare în producție
- **Multi-platform Support**: Compatibil cu AMD64 și ARM64

## 📋 **Prerequisites**

### **System Requirements**
- Docker 20.10+
- Docker Compose 2.0+
- 2GB RAM disponibil
- 5GB disk space

### **Dependencies**
```bash
# Verifică Docker
docker --version

# Verifică Docker Compose
docker-compose --version

# Verifică curl (pentru health checks)
curl --version
```

## 🔧 **Configuration**

### **Environment Variables**
```bash
# Required
NODE_ENV=production
PORT=3003
NOTIFICATION_HUB_HTTP_URL=http://notification-hub:4000
API_SERVER_URL=http://app:3000

# Optional
AWS_REGION=eu-north-1
LOG_LEVEL=info
DYNAMODB_ENDPOINT=http://localhost:8000
```

### **Port Mapping**
```bash
# Host Port : Container Port
3003:3003
```

### **Volume Mounts**
```bash
# Pentru development cu hot-reload
-v $(pwd)/src:/app/src
-v $(pwd)/config:/app/config
```

## 🛠️ **Build Commands**

### **Production Build**
```bash
# Build production image
docker build -t ai-agent-server:latest .

# Build cu tag specific
docker build -t ai-agent-server:v1.0.0 .

# Build cu no-cache
docker build --no-cache -t ai-agent-server:latest .
```

### **Development Build**
```bash
# Build development image
docker build --target development -t ai-agent-server:dev .

# Build cu hot-reload
docker build --target development -t ai-agent-server:dev .
```

### **Multi-platform Build**
```bash
# Build pentru multiple platforme
docker buildx build --platform linux/amd64,linux/arm64 -t ai-agent-server:latest .
```

## 🚀 **Deployment**

### **Standalone Container**
```bash
# Rulează container-ul
docker run -d \
  --name ai-agent-server \
  --restart unless-stopped \
  -p 3003:3003 \
  -e NODE_ENV=production \
  -e PORT=3003 \
  ai-agent-server:latest
```

### **Docker Compose**
```yaml
# docker-compose.yml
version: '3.8'
services:
  ai-agent-server:
    build: .
    ports:
      - "3003:3003"
    environment:
      - NODE_ENV=production
      - PORT=3003
      - NOTIFICATION_HUB_HTTP_URL=http://notification-hub:4000
    networks:
      - app-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3003/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### **Kubernetes Deployment**
```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ai-agent-server
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ai-agent-server
  template:
    metadata:
      labels:
        app: ai-agent-server
    spec:
      containers:
      - name: ai-agent-server
        image: ai-agent-server:latest
        ports:
        - containerPort: 3003
        env:
        - name: NODE_ENV
          value: "production"
        - name: PORT
          value: "3003"
        livenessProbe:
          httpGet:
            path: /health
            port: 3003
          initialDelaySeconds: 30
          periodSeconds: 10
```

## 📊 **Monitoring & Health Checks**

### **Health Check Endpoint**
```bash
# Verifică sănătatea
curl http://localhost:3003/health

# Response așteptat
{
  "status": "ok",
  "timestamp": "2025-09-03T01:30:00.000Z",
  "uptime": "PT1H30M",
  "version": "1.0.0"
}
```

### **Docker Health Check**
```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3003/health || exit 1
```

### **Log Monitoring**
```bash
# Vezi logs în timp real
docker logs -f ai-agent-server

# Vezi ultimele 100 de linii
docker logs --tail 100 ai-agent-server

# Vezi logs cu timestamp
docker logs -t ai-agent-server
```

## 🔍 **Troubleshooting**

### **Common Issues**

#### **1. Container nu pornește**
```bash
# Verifică logs
docker logs ai-agent-server

# Verifică status
docker ps -a

# Verifică port-ul
netstat -tuln | grep 3003
```

#### **2. Health check eșuează**
```bash
# Verifică dacă aplicația rulează în container
docker exec -it ai-agent-server ps aux

# Testează endpoint-ul din container
docker exec -it ai-agent-server curl http://localhost:3003/health
```

#### **3. Probleme de conectivitate**
```bash
# Testează conectivitatea din container
docker exec -it ai-agent-server ping notification-hub

# Verifică variabilele de mediu
docker exec -it ai-agent-server env | grep NOTIFICATION
```

### **Debug Commands**
```bash
# Intră în container
docker exec -it ai-agent-server sh

# Verifică procesele
docker exec -it ai-agent-server ps aux

# Verifică fișierele
docker exec -it ai-agent-server ls -la

# Verifică logs-ul aplicației
docker exec -it ai-agent-server tail -f /app/logs/app.log
```

## 📈 **Performance & Scaling**

### **Resource Limits**
```bash
# Rulează cu limite de resurse
docker run -d \
  --name ai-agent-server \
  --memory=1g \
  --cpus=1.0 \
  --pids-limit=100 \
  -p 3003:3003 \
  ai-agent-server:latest
```

### **Scaling**
```bash
# Scale cu Docker Compose
docker-compose up --scale ai-agent-server=3

# Scale cu Kubernetes
kubectl scale deployment ai-agent-server --replicas=5
```

### **Load Balancing**
```bash
# Nginx load balancer
upstream ai_agent_servers {
    server localhost:3003;
    server localhost:3004;
    server localhost:3005;
}

server {
    listen 80;
    location / {
        proxy_pass http://ai_agent_servers;
    }
}
```

## 🔒 **Security Best Practices**

### **1. Image Security**
```bash
# Scan pentru vulnerabilități
docker scan ai-agent-server:latest

# Verifică dependențele
npm audit

# Update dependențe
npm update
```

### **2. Runtime Security**
```bash
# Rulează cu read-only root
docker run -d \
  --read-only \
  --tmpfs /tmp \
  --tmpfs /var/tmp \
  ai-agent-server:latest

# Rulează cu seccomp profile
docker run -d \
  --security-opt seccomp=unconfined \
  ai-agent-server:latest
```

### **3. Network Security**
```bash
# Rulează cu network custom
docker network create ai-network
docker run -d \
  --network ai-network \
  --network-alias ai-agent \
  ai-agent-server:latest
```

## 🧪 **Testing**

### **Unit Tests**
```bash
# Rulare teste în container
docker run --rm ai-agent-server:latest npm test

# Rulare teste cu coverage
docker run --rm ai-agent-server:latest npm run test:cov
```

### **Integration Tests**
```bash
# Rulare teste de integrare
docker run --rm ai-agent-server:latest npm run test:e2e

# Testare cu dependențe externe
docker-compose -f docker-compose.test.yml up --abort-on-container-exit
```

### **Load Testing**
```bash
# Testare cu Apache Bench
docker run --rm \
  --network host \
  jordimartin/apache-ab \
  ab -n 1000 -c 10 http://localhost:3003/health

# Testare cu Artillery
docker run --rm \
  --network host \
  artilleryio/artillery \
  artillery quick --count 100 --num 10 http://localhost:3003/health
```

## 📚 **Additional Resources**

### **Useful Commands**
```bash
# Verifică dimensiunea image-ului
docker images ai-agent-server

# Verifică istoricul build-ului
docker history ai-agent-server:latest

# Exportă image-ul
docker save ai-agent-server:latest > ai-agent-server.tar

# Importă image-ul
docker load < ai-agent-server.tar
```

### **Development Workflow**
```bash
# 1. Build development image
./docker-build.sh build

# 2. Start development container
docker run -d \
  --name ai-agent-server-dev \
  -v $(pwd)/src:/app/src \
  -v $(pwd)/config:/app/config \
  -p 3003:3003 \
  ai-agent-server:dev

# 3. Monitor logs
docker logs -f ai-agent-server-dev

# 4. Rebuild on changes
docker exec ai-agent-server-dev npm run build
```

### **Production Deployment**
```bash
# 1. Build production image
./docker-build.sh build

# 2. Deploy to production
./docker-build.sh deploy

# 3. Verify deployment
./docker-build.sh status

# 4. Monitor health
curl http://localhost:3003/health
```

## 🎉 **Success Metrics**

### **Deployment Success**
- ✅ Container rulează și răspunde la health checks
- ✅ Port 3003 este accesibil
- ✅ Logs-urile arată startup-ul cu succes
- ✅ Endpoint-ul `/health` returnează status OK

### **Performance Indicators**
- 🚀 Startup time < 30 seconds
- 📊 Memory usage < 512MB
- ⚡ Response time < 100ms pentru health checks
- 🔄 Uptime > 99.9%

### **Monitoring Checklist**
- 📈 Health check endpoint răspunde
- 📊 Container logs sunt vizibile
- 🔍 Resource usage este în limite normale
- 🌐 Network connectivity funcționează
