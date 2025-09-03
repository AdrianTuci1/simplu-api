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
end
