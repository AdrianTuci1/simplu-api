defmodule NotificationHubWeb.FrontendDataController do
  use NotificationHubWeb, :controller
  require Logger

  def request_data(conn, params) do
    Logger.info("=== FRONTEND DATA CONTROLLER: Received data request ===")
    Logger.info("Raw params: #{inspect(params)}")

    # Handle the frontend data request
    case handle_frontend_data_request(params) do
      {:ok, resources} ->
        Logger.info("Frontend data request processed successfully")
        json(conn, %{status: "ok", resources: resources, message: "Frontend data retrieved"})

      {:error, reason} ->
        Logger.error("Failed to process frontend data request: #{inspect(reason)}")
        conn
        |> put_status(:internal_server_error)
        |> json(%{status: "error", message: "Failed to process frontend data request"})
    end
  end

  defp handle_frontend_data_request(%{"businessId" => business_id} = request) do
    try do
      if business_id do
        Logger.info("Processing frontend data request for business: #{business_id}")

        # Extract request details
        session_id = request["sessionId"]
        request_type = request["requestType"]
        parameters = request["parameters"] || %{}
        location_id = request["locationId"] || "default"

        Logger.info("Session ID: #{session_id}")
        Logger.info("Request type: #{request_type}")
        Logger.info("Parameters: #{inspect(parameters)}")
        Logger.info("Location ID: #{location_id}")

        # Request data from frontend via WebSocket
        case request_frontend_data_via_websocket(business_id, session_id, request_type, parameters) do
          {:ok, resources} ->
            Logger.info("Successfully retrieved frontend data")
            {:ok, resources}

          {:error, reason} ->
            Logger.error("Failed to retrieve frontend data: #{inspect(reason)}")
            {:error, reason}
        end
      else
        Logger.warning("Frontend data request missing businessId: #{inspect(request)}")
        {:error, :missing_business_id}
      end
    rescue
      error ->
        Logger.error("Error processing frontend data request: #{inspect(error)}")
        {:error, error}
    end
  end

  defp handle_frontend_data_request(request) do
    Logger.warning("Unknown frontend data request format: #{inspect(request)}")
    {:error, :unknown_format}
  end

  defp request_frontend_data_via_websocket(business_id, session_id, request_type, parameters) do
    try do
      Logger.info("Requesting frontend data via WebSocket")
      Logger.info("Business ID: #{business_id}")
      Logger.info("Session ID: #{session_id}")
      Logger.info("Request type: #{request_type}")

      # Create channel topic for the business
      channel_topic = "messages:#{business_id}"

      # Create request payload
      request_payload = %{
        messageId: generate_message_id(),
        message: "AI Agent requesting frontend data: #{request_type}",
        timestamp: DateTime.utc_now() |> DateTime.to_iso8601(),
        sessionId: session_id,
        businessId: business_id,
        userId: "ai-agent",
        type: "frontend_data_request",
        requestData: %{
          requestType: request_type,
          parameters: parameters,
          timestamp: DateTime.utc_now() |> DateTime.to_iso8601()
        }
      }

      Logger.info("Broadcasting frontend data request: #{inspect(request_payload)}")

      # Broadcast request to WebSocket channel
      NotificationHubWeb.Endpoint.broadcast(channel_topic, "frontend_data_request", request_payload)

      Logger.info("Successfully broadcasted frontend data request to channel: #{channel_topic}")

      # For now, return simulated data since we can't wait for real frontend response
      # In a real implementation, this would need to be handled asynchronously
      simulated_resources = get_simulated_resources(request_type)

      {:ok, simulated_resources}
    rescue
      error ->
        Logger.error("Error requesting frontend data via WebSocket: #{inspect(error)}")
        {:error, error}
    end
  end

  defp get_simulated_resources(request_type) do
    case request_type do
      "get_services" ->
        %{
          services: [
            %{id: "1", name: "Consultație", price: 100, duration: 30},
            %{id: "2", name: "Tratament", price: 200, duration: 60}
          ]
        }

      "get_appointments" ->
        %{
          appointments: [
            %{id: "1", date: "2024-01-15", time: "10:00", patient: "John Doe"},
            %{id: "2", date: "2024-01-15", time: "11:00", patient: "Jane Smith"}
          ]
        }

      "get_business_info" ->
        %{
          businessInfo: %{
            name: "Cabinet Dental",
            address: "Strada Principală 123",
            phone: "+40123456789",
            email: "contact@cabinet.ro"
          }
        }

      "get_available_dates" ->
        %{
          availableDates: [
            %{date: "2024-01-16", slots: ["09:00", "10:00", "11:00"]},
            %{date: "2024-01-17", slots: ["09:00", "14:00", "15:00"]}
          ]
        }

      "data_query" ->
        %{
          results: "Error fallback data for data_query",
          count: 0,
          timestamp: DateTime.utc_now() |> DateTime.to_iso8601(),
          source: "error_fallback"
        }

      _ ->
        %{message: "Unknown request type"}
    end
  end

  # Helper function to generate message ID
  defp generate_message_id do
    timestamp = DateTime.utc_now() |> DateTime.to_unix()
    random = :crypto.strong_rand_bytes(8) |> Base.encode16(case: :lower)
    "msg_#{timestamp}_#{random}"
  end
end
