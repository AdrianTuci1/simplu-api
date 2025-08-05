defmodule NotificationHub.AiAgentClient do
  require Logger

  @doc """
  Send a message to the AI agent via HTTP
  """
  def send_message(tenant_id, user_id, session_id, message_id, content, context \\ %{}) do
    try do
      # Get AI agent HTTP URL from config
      ai_agent_url = Application.get_env(:notification_hub, :ai_agent_http_url, "http://ai-agent-server:3000")

      # Create message request
      request_body = %{
        tenant_id: tenant_id,
        user_id: user_id,
        session_id: session_id,
        message_id: message_id,
        payload: %{
          content: content,
          context: context
        },
        timestamp: DateTime.utc_now() |> DateTime.to_iso8601()
      }

      # Send HTTP POST request to AI agent
      case HTTPoison.post("#{ai_agent_url}/api/messages", Jason.encode!(request_body), [
        {"Content-Type", "application/json"}
      ]) do
        {:ok, %HTTPoison.Response{status_code: 200, body: body}} ->
          case Jason.decode(body) do
            {:ok, response} ->
              Logger.info("Successfully sent message to AI agent: #{inspect(response)}")
              {:ok, response}
            {:error, error} ->
              Logger.error("Failed to decode AI agent response: #{inspect(error)}")
              {:error, error}
          end

        {:ok, %HTTPoison.Response{status_code: status_code, body: body}} ->
          Logger.error("AI agent returned error status #{status_code}: #{body}")
          {:error, "HTTP #{status_code}: #{body}"}

        {:error, error} ->
          Logger.error("Failed to send message to AI agent: #{inspect(error)}")
          {:error, error}
      end
    rescue
      error ->
        Logger.error("Error communicating with AI agent: #{inspect(error)}")
        {:error, error}
    end
  end
end
