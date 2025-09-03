defmodule NotificationHubWeb.AiResponsesController do
  use NotificationHubWeb, :controller
  require Logger

  def create(conn, params) do
    Logger.info("=== AI RESPONSES CONTROLLER: Received AI response ===")
    Logger.info("Raw params: #{inspect(params)}")

    # Handle the AI response
    case handle_ai_response(params) do
      :ok ->
        Logger.info("AI response processed successfully")
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
        Logger.info("Processing AI response for tenant: #{tenant_id}")

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

    Logger.info("Broadcasting AI response to channel: #{channel_topic}")
    Logger.info("Response content: #{response["content"]}")

    # Map response fields to match expected format
    broadcast_payload = %{
      responseId: response["message_id"] || response["responseId"],
      message: response["content"] || response["message"],
      timestamp: response["timestamp"] || DateTime.utc_now() |> DateTime.to_iso8601(),
      sessionId: response["session_id"] || response["sessionId"],
      actions: get_in(response, ["context", "actions"]) || response["actions"] || [],
      businessId: tenant_id,
      userId: response["user_id"] || response["userId"]
    }

    Logger.info("Broadcast payload: #{inspect(broadcast_payload)}")

    NotificationHubWeb.Endpoint.broadcast(channel_topic, "new_message", broadcast_payload)

    Logger.info("Successfully broadcasted AI response to channel: #{channel_topic}")
  end
end
