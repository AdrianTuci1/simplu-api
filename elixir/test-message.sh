#!/bin/bash

# Verifică dacă containerul este pornit
if ! docker ps | grep -q simplu-api-elixir-1; then
    echo "Containerul nu este pornit. Pornește-l mai întâi."
    exit 1
fi

# Execute the script in the container using iex
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
    
    # Creăm producer-ul pentru topic-ul agent.events
    topic = "agent.events"
    Logger.info("Creating producer for topic #{topic}...")
    case :brod.start_producer(:kafka_client, topic, []) do
      :ok ->
        Logger.info("Producer started successfully")
        
        # Publicăm mesajul
        message = Jason.encode!(%{
          "timestamp" => DateTime.utc_now() |> DateTime.to_iso8601(),
          "type" => "agent.request",
          "messageId" => "saaaao-psso-48839",
          "payload" => %{
            "context" => %{},
            "content" => "Hello from Elixir!",
            "role" => "user"
          },
          "tenantId" => "test-tenant"
        })

        Logger.info("Publishing message to #{topic}...")
        case :brod.produce_sync(:kafka_client, topic, 0, "test-tenant", message) do
          :ok ->
            Logger.info("Message published successfully")
            IO.puts("Mesaj publicat cu succes pe topic-ul #{topic}")
          error ->
            Logger.error("Error publishing message: #{inspect(error)}")
            IO.puts("Eroare la publicarea mesajului: #{inspect(error)}")
        end
        
      error ->
        Logger.error("Error starting producer: #{inspect(error)}")
        IO.puts("Eroare la pornirea producer-ului: #{inspect(error)}")
    end
    
  {:error, reason} ->
    Logger.error("Failed to start Kafka client: #{inspect(reason)}")
    IO.puts("Eroare la conectarea la Kafka: #{inspect(reason)}")
end
' 