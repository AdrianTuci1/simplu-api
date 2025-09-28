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
          "frontend.data" ->
            Logger.info("Processing frontend data for tenant: #{tenant_id}")
            broadcast_frontend_data(tenant_id, response)
          "draft.created" ->
            Logger.info("Processing draft creation for tenant: #{tenant_id}")
            broadcast_draft_created(tenant_id, response)
          "draft.updated" ->
            Logger.info("Processing draft update for tenant: #{tenant_id}")
            broadcast_draft_updated(tenant_id, response)
          "draft.deleted" ->
            Logger.info("Processing draft deletion for tenant: #{tenant_id}")
            broadcast_draft_deleted(tenant_id, response)
          "draft.listed" ->
            Logger.info("Processing draft listing for tenant: #{tenant_id}")
            broadcast_drafts_listed(tenant_id, response)
          _ ->
            Logger.info("Processing regular AI response for tenant: #{tenant_id}")
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

  defp broadcast_frontend_data(tenant_id, response) do
    # Broadcast to messages channel
    channel_topic = "messages:#{tenant_id}"

    Logger.info("Broadcasting frontend data to channel: #{channel_topic}")
    Logger.info("Frontend data content: #{response["content"]}")

    # Extract frontend data from context
    context = response["context"] || %{}
    frontend_data = %{
      requestType: context["requestType"],
      parameters: context["parameters"] || %{},
      resources: context["resources"],
      locationId: context["locationId"] || "default",
      timestamp: context["timestamp"] || response["timestamp"] || DateTime.utc_now() |> DateTime.to_iso8601()
    }

    # Map response fields to match expected format for frontend data
    broadcast_payload = %{
      messageId: response["message_id"] || response["responseId"],
      message: response["content"] || response["message"],
      timestamp: response["timestamp"] || DateTime.utc_now() |> DateTime.to_iso8601(),
      sessionId: response["session_id"] || response["sessionId"],
      businessId: tenant_id,
      locationId: context["locationId"] || "default",
      userId: response["user_id"] || response["userId"] || "system",
      type: "frontend_data",
      frontendData: frontend_data
    }

    Logger.info("Frontend data broadcast payload: #{inspect(broadcast_payload)}")

    # Broadcast to both messages channel and a dedicated frontend data channel
    NotificationHubWeb.Endpoint.broadcast(channel_topic, "frontend_data_available", broadcast_payload)
    NotificationHubWeb.Endpoint.broadcast(channel_topic, "new_message", broadcast_payload)

    Logger.info("Successfully broadcasted frontend data to channel: #{channel_topic}")
  end

  defp broadcast_draft_created(tenant_id, response) do
    # Broadcast to messages channel
    channel_topic = "messages:#{tenant_id}"

    Logger.info("Broadcasting draft creation to channel: #{channel_topic}")
    Logger.info("Draft creation content: #{response["content"]}")

    # Extract draft data from context
    context = response["context"] || %{}
    draft_data = %{
      draftId: context["draftId"],
      draftType: context["draftType"],
      content: context["content"],
      status: context["status"] || "pending",
      locationId: context["locationId"] || "default",
      timestamp: context["timestamp"] || response["timestamp"] || DateTime.utc_now() |> DateTime.to_iso8601()
    }

    # Map response fields to match expected format for draft creation
    broadcast_payload = %{
      messageId: response["message_id"] || response["responseId"],
      message: response["content"] || response["message"],
      timestamp: response["timestamp"] || DateTime.utc_now() |> DateTime.to_iso8601(),
      sessionId: response["session_id"] || response["sessionId"],
      businessId: tenant_id,
      locationId: context["locationId"] || "default",
      userId: response["user_id"] || response["userId"] || "system",
      type: "draft_created",
      draftData: draft_data
    }

    Logger.info("Draft creation broadcast payload: #{inspect(broadcast_payload)}")

    # Broadcast to both messages channel and a dedicated draft channel
    NotificationHubWeb.Endpoint.broadcast(channel_topic, "draft_created", broadcast_payload)
    NotificationHubWeb.Endpoint.broadcast(channel_topic, "new_message", broadcast_payload)

    Logger.info("Successfully broadcasted draft creation to channel: #{channel_topic}")
  end

  defp broadcast_draft_updated(tenant_id, response) do
    # Broadcast to messages channel
    channel_topic = "messages:#{tenant_id}"

    Logger.info("Broadcasting draft update to channel: #{channel_topic}")
    Logger.info("Draft update content: #{response["content"]}")

    # Extract draft data from context
    context = response["context"] || %{}
    draft_data = %{
      draftId: context["draftId"],
      draftType: context["draftType"],
      content: context["content"],
      status: context["status"] || "updated",
      locationId: context["locationId"] || "default",
      timestamp: context["timestamp"] || response["timestamp"] || DateTime.utc_now() |> DateTime.to_iso8601()
    }

    # Map response fields to match expected format for draft update
    broadcast_payload = %{
      messageId: response["message_id"] || response["responseId"],
      message: response["content"] || response["message"],
      timestamp: response["timestamp"] || DateTime.utc_now() |> DateTime.to_iso8601(),
      sessionId: response["session_id"] || response["sessionId"],
      businessId: tenant_id,
      locationId: context["locationId"] || "default",
      userId: response["user_id"] || response["userId"] || "system",
      type: "draft_updated",
      draftData: draft_data
    }

    Logger.info("Draft update broadcast payload: #{inspect(broadcast_payload)}")

    # Broadcast to both messages channel and a dedicated draft channel
    NotificationHubWeb.Endpoint.broadcast(channel_topic, "draft_updated", broadcast_payload)
    NotificationHubWeb.Endpoint.broadcast(channel_topic, "new_message", broadcast_payload)

    Logger.info("Successfully broadcasted draft update to channel: #{channel_topic}")
  end

  defp broadcast_draft_deleted(tenant_id, response) do
    # Broadcast to messages channel
    channel_topic = "messages:#{tenant_id}"

    Logger.info("Broadcasting draft deletion to channel: #{channel_topic}")
    Logger.info("Draft deletion content: #{response["content"]}")

    # Extract draft data from context
    context = response["context"] || %{}
    draft_data = %{
      draftId: context["draftId"],
      draftType: context["draftType"],
      status: "deleted",
      locationId: context["locationId"] || "default",
      timestamp: context["timestamp"] || response["timestamp"] || DateTime.utc_now() |> DateTime.to_iso8601()
    }

    # Map response fields to match expected format for draft deletion
    broadcast_payload = %{
      messageId: response["message_id"] || response["responseId"],
      message: response["content"] || response["message"],
      timestamp: response["timestamp"] || DateTime.utc_now() |> DateTime.to_iso8601(),
      sessionId: response["session_id"] || response["sessionId"],
      businessId: tenant_id,
      locationId: context["locationId"] || "default",
      userId: response["user_id"] || response["userId"] || "system",
      type: "draft_deleted",
      draftData: draft_data
    }

    Logger.info("Draft deletion broadcast payload: #{inspect(broadcast_payload)}")

    # Broadcast to both messages channel and a dedicated draft channel
    NotificationHubWeb.Endpoint.broadcast(channel_topic, "draft_deleted", broadcast_payload)
    NotificationHubWeb.Endpoint.broadcast(channel_topic, "new_message", broadcast_payload)

    Logger.info("Successfully broadcasted draft deletion to channel: #{channel_topic}")
  end

  defp broadcast_drafts_listed(tenant_id, response) do
    # Broadcast to messages channel
    channel_topic = "messages:#{tenant_id}"

    Logger.info("Broadcasting draft listing to channel: #{channel_topic}")
    Logger.info("Draft listing content: #{response["content"]}")

    # Extract draft data from context
    context = response["context"] || %{}
    draft_data = %{
      drafts: context["drafts"] || [],
      filters: context["filters"] || %{},
      totalCount: context["totalCount"] || 0,
      locationId: context["locationId"] || "default",
      timestamp: context["timestamp"] || response["timestamp"] || DateTime.utc_now() |> DateTime.to_iso8601()
    }

    # Map response fields to match expected format for draft listing
    broadcast_payload = %{
      messageId: response["message_id"] || response["responseId"],
      message: response["content"] || response["message"],
      timestamp: response["timestamp"] || DateTime.utc_now() |> DateTime.to_iso8601(),
      sessionId: response["session_id"] || response["sessionId"],
      businessId: tenant_id,
      locationId: context["locationId"] || "default",
      userId: response["user_id"] || response["userId"] || "system",
      type: "drafts_listed",
      draftData: draft_data
    }

    Logger.info("Draft listing broadcast payload: #{inspect(broadcast_payload)}")

    # Broadcast to both messages channel and a dedicated draft channel
    NotificationHubWeb.Endpoint.broadcast(channel_topic, "drafts_listed", broadcast_payload)
    NotificationHubWeb.Endpoint.broadcast(channel_topic, "new_message", broadcast_payload)

    Logger.info("Successfully broadcasted draft listing to channel: #{channel_topic}")
  end
end
