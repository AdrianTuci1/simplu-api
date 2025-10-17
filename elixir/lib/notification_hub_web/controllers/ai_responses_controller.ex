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

        # Check if this is frontend data
        response_type = response["type"]

        case response_type do
          "function_call" ->
            Logger.info("Processing function call for tenant: #{tenant_id}")
            broadcast_function_call(tenant_id, response)
          _ ->
            Logger.info("Processing AI response for tenant: #{tenant_id} (type: #{response_type || "default"})")
            broadcast_ai_response(tenant_id, response)
        end

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
    # Broadcast to messages channel by user id
    channel_topic = "messages:#{response["user_id"]}"

    Logger.info("Broadcasting AI response to channel (user): #{channel_topic}")
    Logger.info("Response content: #{response["content"]}")

    # Extract context information
    context = response["context"] || %{}
    streaming_type = context["type"]
    is_complete = context["isComplete"]

    # Map response fields to match expected format
    broadcast_payload = %{
      responseId: response["message_id"] || response["responseId"],
      message: response["content"] || response["message"],
      timestamp: response["timestamp"] || DateTime.utc_now() |> DateTime.to_iso8601(),
      sessionId: response["session_id"] || response["sessionId"],
      actions: get_in(response, ["context", "actions"]) || response["actions"] || [],
      businessId: tenant_id,
      userId: response["user_id"] || response["userId"],
      # Add streaming information for frontend
      streaming: %{
        type: streaming_type,
        isComplete: is_complete,
        isChunk: streaming_type == "streaming_chunk"
      },
      toolsUsed: context["toolsUsed"] || []
    }

    Logger.info("Broadcast payload: #{inspect(broadcast_payload)}")

    NotificationHubWeb.Endpoint.broadcast(channel_topic, "new_message", broadcast_payload)

    Logger.info("Successfully broadcasted AI response to channel: #{channel_topic}")
  end

  defp broadcast_function_call(tenant_id, response) do
    # Broadcast function call to messages channel by user id
    channel_topic = "messages:#{response["user_id"]}"

    Logger.info("Broadcasting function call to channel (user): #{channel_topic}")
    Logger.info("Function call content: #{response["content"]}")

    # Extract function call data from context
    context = response["context"] || %{}
    function_data = %{
      functionName: context["functionName"],
      parameters: context["parameters"] || %{},
      locationId: context["locationId"] || "default",
      timestamp: context["timestamp"] || response["timestamp"] || DateTime.utc_now() |> DateTime.to_iso8601()
    }

    # Map response fields to match expected format for function call
    broadcast_payload = %{
      messageId: response["message_id"] || response["responseId"],
      message: response["content"] || response["message"],
      timestamp: response["timestamp"] || DateTime.utc_now() |> DateTime.to_iso8601(),
      sessionId: response["session_id"] || response["sessionId"],
      businessId: tenant_id,
      locationId: context["locationId"] || "default",
      userId: response["user_id"] || response["userId"] || "agent",
      type: "function_call",
      functionData: function_data
    }

    Logger.info("Function call broadcast payload: #{inspect(broadcast_payload)}")

    # Broadcast to messages channel with special event "ai_function_call"
    NotificationHubWeb.Endpoint.broadcast(channel_topic, "ai_function_call", broadcast_payload)

    Logger.info("Successfully broadcasted function call to channel: #{channel_topic}")
  end

end
