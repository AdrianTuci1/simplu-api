defmodule NotificationHubWeb.NotificationsController do
  use NotificationHubWeb, :controller
  require Logger

  def create(conn, params) do
    Logger.info("Received resource notification: #{inspect(params)}")

    # Handle the resource notification
    case handle_resource_notification(params) do
      :ok ->
        json(conn, %{status: "ok", message: "Notification processed"})

      {:error, reason} ->
        Logger.error("Failed to process notification: #{inspect(reason)}")
        conn
        |> put_status(:internal_server_error)
        |> json(%{status: "error", message: "Failed to process notification"})
    end
  end

  defp handle_resource_notification(%{"type" => type} = notification) do
    try do
      # Extract business and location info
      business_id = notification["businessId"]
      location_id = notification["locationId"]

      if business_id && location_id do
        # Broadcast to WebSocket channels
        broadcast_resource_update(business_id, location_id, notification)
        :ok
      else
        Logger.warning("Notification missing businessId or locationId: #{inspect(notification)}")
        {:error, :missing_business_or_location}
      end
    rescue
      error ->
        Logger.error("Error processing notification: #{inspect(error)}")
        {:error, error}
    end
  end

  defp handle_resource_notification(notification) do
    Logger.warning("Unknown notification format: #{inspect(notification)}")
    {:error, :unknown_format}
  end

  defp broadcast_resource_update(business_id, location_id, notification) do
    # Broadcast to specific business-location channel
    channel_topic = "resources:#{business_id}-#{location_id}"
    NotificationHubWeb.Endpoint.broadcast(channel_topic, "resource_update", notification)

    # Also broadcast to business-wide channel
    business_topic = "resources:#{business_id}"
    NotificationHubWeb.Endpoint.broadcast(business_topic, "resource_update", notification)

    Logger.info("Broadcasted #{notification["type"]} to channels: #{channel_topic}, #{business_topic}")
  end
end
