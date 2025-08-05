defmodule NotificationHubWeb.AiResponsesController do
  use NotificationHubWeb, :controller
  require Logger

  def create(conn, params) do
    Logger.info("Received AI response: #{inspect(params)}")

    # Handle the AI response
    case handle_ai_response(params) do
      :ok ->
        json(conn, %{status: "ok", message: "AI response processed"})

      {:error, reason} ->
        Logger.error("Failed to process AI response: #{inspect(reason)}")
        conn
        |> put_status(:internal_server_error)
        |> json(%{status: "error", message: "Failed to process AI response"})
    end
  end

  defp handle_ai_response(%{"tenant_id" => tenant_id} = response) do
    try do
      if tenant_id do
        # Broadcast to WebSocket channel
        broadcast_ai_response(tenant_id, response)
        :ok
      else
        Logger.warning("AI response missing tenant_id: #{inspect(response)}")
        {:error, :missing_tenant_id}
      end
    rescue
      error ->
        Logger.error("Error processing AI response: #{inspect(error)}")
        {:error, error}
    end
  end

  defp handle_ai_response(response) do
    Logger.warning("Unknown AI response format: #{inspect(response)}")
    {:error, :unknown_format}
  end

  defp broadcast_ai_response(tenant_id, response) do
    # Broadcast to messages channel
    channel_topic = "messages:#{tenant_id}"
    NotificationHubWeb.Endpoint.broadcast(channel_topic, "new_message", %{
      message_id: response["message_id"],
      content: response["content"],
      context: response["context"] || %{},
      user_id: response["user_id"],
      session_id: response["session_id"],
      timestamp: response["timestamp"],
      role: "agent"
    })

    Logger.info("Broadcasted AI response to channel: #{channel_topic}")
  end
end
