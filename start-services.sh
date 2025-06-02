#!/bin/bash

# Culori pentru output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Funcție pentru a afișa mesaje
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

# Funcție pentru a verifica dacă un serviciu este gata
wait_for_service() {
    local service=$1
    local max_attempts=30
    local attempt=1

    log "Waiting for $service to be ready..."
    while [ $attempt -le $max_attempts ]; do
        if docker-compose ps $service | grep -q "Up"; then
            log "$service is ready!"
            return 0
        fi
        warn "Attempt $attempt/$max_attempts: $service is not ready yet..."
        sleep 2
        attempt=$((attempt + 1))
    done
    error "$service failed to start after $max_attempts attempts"
    return 1
}

# Funcție pentru a opri toate serviciile
stop_services() {
    log "Stopping all services..."
    docker-compose down -v
}

# Funcție pentru a porni serviciile în ordinea corectă
start_services() {
    log "Starting services in the correct order..."

    # 1. Pornește Zookeeper
    log "Starting Zookeeper..."
    docker-compose up -d zookeeper
    wait_for_service zookeeper || exit 1

    # 2. Pornește Kafka
    log "Starting Kafka..."
    docker-compose up -d kafka
    wait_for_service kafka || exit 1

    # 3. Pornește restul serviciilor
    log "Starting remaining services..."
    docker-compose up -d

    log "All services started successfully!"
}

# Funcție pentru a reporni serviciile
restart_services() {
    log "Restarting all services..."
    stop_services
    start_services
}

# Funcție pentru a afișa statusul serviciilor
status_services() {
    log "Current services status:"
    docker-compose ps
}

# Funcție pentru a publica un mesaj de test și a asculta răspunsul
publish_test_message() {
    log "Publishing test message to Kafka..."
    
    # Verifică dacă containerul Elixir este pornit
    if ! docker ps | grep -q simplu-api-elixir-1; then
        error "Elixir container is not running. Please start services first."
        exit 1
    fi

    # Publică mesajul și ascultă răspunsul
    docker exec -it simplu-api-elixir-1 /app/bin/kafka_consumer eval '
    require Logger
    Logger.info("Starting test message script...")

    # Pornește aplicațiile necesare
    Application.ensure_all_started(:brod)
    Application.ensure_all_started(:broadway)
    Logger.info("Applications started")

    # Inițializăm clientul Kafka
    brokers = [{"kafka", 29092}]
    Logger.info("Connecting to Kafka at #{inspect(brokers)}")

    case :brod.start_client(brokers, :kafka_client) do
      :ok ->
        Logger.info("Kafka client started successfully")
        
        # Definim topicurile pentru publicare și consum
        publisher_topic = "elixir.to.agent"
        consumer_topic = "agent.to.elixir"
        Logger.info("Using topics - Publisher: #{publisher_topic}, Consumer: #{consumer_topic}")
        
        # Creăm consumer-ul pentru topic-ul agent.to.elixir
        consumer_config = [
          begin_offset: :earliest,
          offset_reset_policy: :reset_to_earliest,
          max_bytes: 1_000_000,
          max_wait_time: 10_000,
          sleep_timeout: 1_000
        ]
        
        case :brod.start_consumer(:kafka_client, consumer_topic, consumer_config) do
          :ok ->
            Logger.info("Consumer started successfully for #{consumer_topic}")
            
            # Creăm producer-ul pentru topic-ul elixir.to.agent
            case :brod.start_producer(:kafka_client, publisher_topic, []) do
              :ok ->
                Logger.info("Producer started successfully for #{publisher_topic}")
                
                # Publicăm mesajul
                message = Jason.encode!(%{
                  "timestamp" => DateTime.utc_now() |> DateTime.to_iso8601(),
                  "type" => "agent.request",
                  "messageId" => "saaaao-psso-48839",
                  "payload" => %{
                    "context" => %{
                      "type" => "test_message"
                    },
                    "content" => "Hello from Elixir!",
                    "role" => "user"
                  },
                  "tenantId" => "test-tenant"
                })

                Logger.info("Publishing message to #{publisher_topic}...")
                case :brod.produce_sync(:kafka_client, publisher_topic, 0, "test-tenant", message) do
                  :ok ->
                    Logger.info("Message published successfully")
                    IO.puts("Mesaj publicat cu succes pe topic-ul #{publisher_topic}")
                    
                    # Ascultăm răspunsul pe topic-ul agent.to.elixir
                    Logger.info("Waiting for response on #{consumer_topic}...")
                    receive do
                      {:kafka_message, _topic, _partition, _offset, _key, value} ->
                        Logger.info("Received response: #{inspect(value)}")
                        IO.puts("Am primit răspuns pe #{consumer_topic}: #{inspect(value)}")
                    after
                      10_000 ->
                        Logger.error("Timeout waiting for response")
                        IO.puts("Timeout așteptând răspunsul pe #{consumer_topic}")
                    end
                    
                  error ->
                    Logger.error("Error publishing message: #{inspect(error)}")
                    IO.puts("Eroare la publicarea mesajului: #{inspect(error)}")
                end
                
              error ->
                Logger.error("Error starting producer: #{inspect(error)}")
                IO.puts("Eroare la pornirea producer-ului: #{inspect(error)}")
            end
            
          error ->
            Logger.error("Error starting consumer: #{inspect(error)}")
            IO.puts("Eroare la pornirea consumer-ului: #{inspect(error)}")
        end
        
      {:error, reason} ->
        Logger.error("Failed to start Kafka client: #{inspect(reason)}")
        IO.puts("Eroare la conectarea la Kafka: #{inspect(reason)}")
    end
    '

    log "Test message published and waiting for response!"
}

# Meniu principal
case "$1" in
    "start")
        start_services
        ;;
    "stop")
        stop_services
        ;;
    "restart")
        restart_services
        ;;
    "status")
        status_services
        ;;
    "test")
        publish_test_message
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|test}"
        exit 1
        ;;
esac

exit 0 