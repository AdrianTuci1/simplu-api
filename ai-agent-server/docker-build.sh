#!/bin/bash

# Docker Build and Deploy Script pentru AI Agent Server
# Usage: ./docker-build.sh [build|deploy|build-deploy|clean]

set -e

# Colors pentru output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
IMAGE_NAME="ai-agent-server"
TAG="latest"
CONTAINER_NAME="ai-agent-server-container"
PORT="3003"

# Functie pentru logging
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# Functie pentru verificarea dependențelor
check_dependencies() {
    log "Verificare dependențe..."
    
    if ! command -v docker &> /dev/null; then
        error "Docker nu este instalat sau nu este în PATH"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose nu este instalat sau nu este în PATH"
        exit 1
    fi
    
    log "Dependențe verificate cu succes"
}

# Functie pentru build
build_image() {
    log "Building Docker image: ${IMAGE_NAME}:${TAG}"
    
    # Verifică dacă Dockerfile există
    if [ ! -f "Dockerfile" ]; then
        error "Dockerfile nu a fost găsit în directorul curent"
        exit 1
    fi
    
    # Build image
    docker build -t ${IMAGE_NAME}:${TAG} .
    
    if [ $? -eq 0 ]; then
        log "Image built successfully: ${IMAGE_NAME}:${TAG}"
        
        # Afișează informații despre image
        info "Image details:"
        docker images ${IMAGE_NAME}:${TAG}
    else
        error "Build failed"
        exit 1
    fi
}

# Functie pentru deploy
deploy_container() {
    log "Deploying container: ${CONTAINER_NAME}"
    
    # Oprește container-ul existent dacă rulează
    if docker ps -q -f name=${CONTAINER_NAME} | grep -q .; then
        warn "Stopping existing container: ${CONTAINER_NAME}"
        docker stop ${CONTAINER_NAME}
        docker rm ${CONTAINER_NAME}
    fi
    
    # Șterge container-ul dacă există dar nu rulează
    if docker ps -aq -f name=${CONTAINER_NAME} | grep -q .; then
        warn "Removing existing stopped container: ${CONTAINER_NAME}"
        docker rm ${CONTAINER_NAME}
    fi
    
    # Rulează container-ul
    log "Starting new container: ${CONTAINER_NAME}"
    docker run -d \
        --name ${CONTAINER_NAME} \
        --restart unless-stopped \
        -p ${PORT}:3003 \
        -e NODE_ENV=production \
        -e PORT=3003 \
        -e NOTIFICATION_HUB_HTTP_URL=http://notification-hub:4000 \
        -e API_SERVER_URL=http://app:3000 \
        -e AWS_REGION=eu-north-1 \
        -e LOG_LEVEL=info \
        ${IMAGE_NAME}:${TAG}
    
    if [ $? -eq 0 ]; then
        log "Container started successfully: ${CONTAINER_NAME}"
        
        # Așteaptă să pornească
        info "Waiting for container to start..."
        sleep 5
        
        # Verifică status-ul
        if docker ps -q -f name=${CONTAINER_NAME} | grep -q .; then
            log "Container is running"
            info "Container details:"
            docker ps -f name=${CONTAINER_NAME}
            
            # Health check
            info "Performing health check..."
            if curl -f http://localhost:${PORT}/health > /dev/null 2>&1; then
                log "Health check passed - AI Agent Server is ready!"
            else
                warn "Health check failed - container may still be starting"
            fi
        else
            error "Container failed to start"
            exit 1
        fi
    else
        error "Failed to start container"
        exit 1
    fi
}

# Functie pentru build și deploy
build_and_deploy() {
    log "Building and deploying AI Agent Server..."
    build_image
    deploy_container
    log "Build and deploy completed successfully!"
}

# Functie pentru cleanup
cleanup() {
    log "Cleaning up Docker resources..."
    
    # Oprește și șterge container-ul
    if docker ps -q -f name=${CONTAINER_NAME} | grep -q .; then
        warn "Stopping container: ${CONTAINER_NAME}"
        docker stop ${CONTAINER_NAME}
    fi
    
    if docker ps -aq -f name=${CONTAINER_NAME} | grep -q .; then
        warn "Removing container: ${CONTAINER_NAME}"
        docker rm ${CONTAINER_NAME}
    fi
    
    # Șterge image-ul
    if docker images -q ${IMAGE_NAME}:${TAG} | grep -q .; then
        warn "Removing image: ${IMAGE_NAME}:${TAG}"
        docker rmi ${IMAGE_NAME}:${TAG}
    fi
    
    # Cleanup dangling images
    if docker images -f "dangling=true" -q | grep -q .; then
        warn "Removing dangling images..."
        docker image prune -f
    fi
    
    log "Cleanup completed"
}

# Functie pentru status
show_status() {
    log "AI Agent Server Status:"
    echo "----------------------------------------"
    
    # Container status
    if docker ps -q -f name=${CONTAINER_NAME} | grep -q .; then
        echo "Container: ${GREEN}RUNNING${NC}"
        docker ps -f name=${CONTAINER_NAME} --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    else
        echo "Container: ${RED}NOT RUNNING${NC}"
    fi
    
    echo ""
    
    # Image status
    if docker images -q ${IMAGE_NAME}:${TAG} | grep -q .; then
        echo "Image: ${GREEN}EXISTS${NC}"
        docker images ${IMAGE_NAME}:${TAG} --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"
    else
        echo "Image: ${RED}NOT FOUND${NC}"
    fi
    
    echo ""
    
    # Port status
    if netstat -tuln 2>/dev/null | grep -q ":${PORT} "; then
        echo "Port ${PORT}: ${GREEN}LISTENING${NC}"
    else
        echo "Port ${PORT}: ${RED}NOT LISTENING${NC}"
    fi
    
    echo "----------------------------------------"
}

# Functie pentru logs
show_logs() {
    log "Showing logs for container: ${CONTAINER_NAME}"
    
    if docker ps -q -f name=${CONTAINER_NAME} | grep -q .; then
        docker logs -f ${CONTAINER_NAME}
    else
        error "Container ${CONTAINER_NAME} is not running"
        exit 1
    fi
}

# Functie pentru help
show_help() {
    echo "AI Agent Server Docker Build and Deploy Script"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  build           Build Docker image"
    echo "  deploy          Deploy container (requires existing image)"
    echo "  build-deploy    Build image and deploy container"
    echo "  clean           Clean up Docker resources"
    echo "  status          Show current status"
    echo "  logs            Show container logs"
    echo "  help            Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 build-deploy    # Build and deploy in one command"
    echo "  $0 status          # Check current status"
    echo "  $0 logs            # View logs"
    echo ""
}

# Main script logic
main() {
    case "${1:-help}" in
        "build")
            check_dependencies
            build_image
            ;;
        "deploy")
            check_dependencies
            deploy_container
            ;;
        "build-deploy")
            check_dependencies
            build_and_deploy
            ;;
        "clean")
            check_dependencies
            cleanup
            ;;
        "status")
            check_dependencies
            show_status
            ;;
        "logs")
            check_dependencies
            show_logs
            ;;
        "help"|*)
            show_help
            ;;
    esac
}

# Rulează script-ul
main "$@"
