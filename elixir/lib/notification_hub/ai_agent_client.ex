defmodule NotificationHub.AiAgentClient do
  require Logger

  @doc """
  Check AI Agent Server health
  """
  def check_health do
    try do
      ai_agent_url = Application.get_env(:notification_hub, :ai_agent_http_url, "http://ai-agent-server:3003")
      health_url = "#{ai_agent_url}/health"

      Logger.info("Checking AI Agent Server health: #{health_url}")

      case HTTPoison.get(health_url, [], [timeout: 5000]) do
        {:ok, %HTTPoison.Response{status_code: 200, body: body}} ->
          Logger.info("AI Agent Server is healthy: #{body}")
          {:ok, "healthy"}

        {:ok, %HTTPoison.Response{status_code: status_code, body: body}} ->
          Logger.warning("AI Agent Server returned status #{status_code}: #{body}")
          {:warning, "Status #{status_code}: #{body}"}

        {:error, error} ->
          Logger.error("Failed to check AI Agent Server health: #{inspect(error)}")
          {:error, "Health check failed: #{error}"}
      end

    rescue
      error ->
        Logger.error("Error checking AI Agent Server health: #{inspect(error)}")
        {:error, "Health check error: #{error}"}
    end
  end

  @doc """
  Get AI Agent Server configuration
  """
  def get_config do
    %{
      ai_agent_url: Application.get_env(:notification_hub, :ai_agent_http_url, "http://ai-agent-server:3003"),
      websocket_url: "ws://ai-agent-server:3003/socket/websocket",
      timeout: 5000
    }
  end

  @doc """
  Test connection to AI Agent Server
  """
  def test_connection do
    try do
      ai_agent_url = Application.get_env(:notification_hub, :ai_agent_http_url, "http://ai-agent-server:3003")
      test_url = "#{ai_agent_url}/health"

      Logger.info("Testing connection to AI Agent Server: #{test_url}")

      start_time = System.monotonic_time(:millisecond)

      case HTTPoison.get(test_url, [], [timeout: 3000]) do
        {:ok, %HTTPoison.Response{status_code: 200}} ->
          end_time = System.monotonic_time(:millisecond)
          latency = end_time - start_time

          Logger.info("Connection test successful - Latency: #{latency}ms")
          {:ok, %{success: true, latency: latency}}

        {:ok, %HTTPoison.Response{status_code: status_code}} ->
          Logger.warning("Connection test returned status #{status_code}")
          {:warning, %{success: false, status: status_code}}

        {:error, error} ->
          Logger.error("Connection test failed: #{inspect(error)}")
          {:error, %{success: false, error: error}}
      end

    rescue
      error ->
        Logger.error("Connection test error: #{inspect(error)}")
        {:error, %{success: false, error: error}}
    end
  end

  @doc """
  Handle frontend data from AI Agent Server
  """
  def handle_frontend_data(tenant_id, frontend_data) do
    try do
      Logger.info("=== HANDLING FRONTEND DATA ===")
      Logger.info("Tenant ID: #{tenant_id}")
      Logger.info("Frontend data: #{inspect(frontend_data)}")

      # Extract frontend data details
      request_type = frontend_data["requestType"]
      resources = frontend_data["resources"]
      parameters = frontend_data["parameters"] || %{}
      timestamp = frontend_data["timestamp"]

      Logger.info("Request type: #{request_type}")
      Logger.info("Resources: #{inspect(resources)}")
      Logger.info("Parameters: #{inspect(parameters)}")

      # Broadcast frontend data to WebSocket clients (user-scoped when available)
      channel_topic = "messages:#{frontend_data["userId"] || frontend_data["user_id"] || tenant_id}"

      broadcast_payload = %{
        messageId: generate_message_id(),
        message: "Frontend data retrieved: #{request_type}",
        timestamp: timestamp || DateTime.utc_now() |> DateTime.to_iso8601(),
        sessionId: frontend_data["sessionId"],
        businessId: tenant_id,
        userId: frontend_data["userId"] || "system",
        type: "frontend_data",
        frontendData: %{
          requestType: request_type,
          parameters: parameters,
          resources: resources,
          timestamp: timestamp
        }
      }

      Logger.info("Broadcasting frontend data to channel: #{channel_topic} | payload: #{inspect(broadcast_payload)}")

      # Broadcast to WebSocket channel
      NotificationHubWeb.Endpoint.broadcast(channel_topic, "frontend_data_available", broadcast_payload)

      Logger.info("Successfully broadcasted frontend data to channel: #{channel_topic}")
      {:ok, broadcast_payload}

    rescue
      error ->
        Logger.error("Error handling frontend data: #{inspect(error)}")
        {:error, error}
    end
  end



  # Helper function to generate message ID
  defp generate_message_id do
    timestamp = DateTime.utc_now() |> DateTime.to_unix()
    random = :crypto.strong_rand_bytes(8) |> Base.encode16(case: :lower)
    "msg_#{timestamp}_#{random}"
  end
end
