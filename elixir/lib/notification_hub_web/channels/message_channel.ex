defmodule NotificationHubWeb.MessageChannel do
  use Phoenix.Channel
  require Logger
  alias NotificationHub.AiAgentClient

  @impl true
  def join("messages:" <> tenant_id, _payload, socket) do
    Logger.info("Client joined messages channel: messages:#{tenant_id}")
    {:ok, socket}
  end

  @impl true
  def join(_topic, _payload, _socket) do
    {:error, %{reason: "unauthorized"}}
  end

  @impl true
  def handle_in("ping", payload, socket) do
    {:reply, {:ok, payload}, socket}
  end

  @impl true
  def handle_in("new_message", payload, socket) do
    Logger.info("=== MESSAGE CHANNEL: Received new_message event ===")
    Logger.info("Raw payload: #{inspect(payload)}")
    Logger.info("Socket topic: #{socket.topic}")
    Logger.info("Socket assigns: #{inspect(socket.assigns)}")

    case process_message(payload, socket) do
      {:ok, response} ->
        Logger.info("Message processed successfully: #{inspect(response)}")
        # Răspuns de confirmare către client
        {:reply, {:ok, response}, socket}

      {:error, reason} ->
        Logger.error("Failed to process message: #{inspect(reason)}")
        {:reply, {:error, reason}, socket}
    end
  end

  @impl true
  def handle_in("send_message", payload, socket) do
    Logger.info("=== MESSAGE CHANNEL: Received send_message event ===")
    Logger.info("Raw payload: #{inspect(payload)}")
    Logger.info("Socket topic: #{socket.topic}")
    Logger.info("Socket assigns: #{inspect(socket.assigns)}")

    case process_message(payload, socket) do
      {:ok, response} ->
        Logger.info("Message processed successfully: #{inspect(response)}")
        # Răspuns de confirmare către client
        {:reply, {:ok, response}, socket}

      {:error, reason} ->
        Logger.error("Failed to process message: #{inspect(reason)}")
        {:reply, {:error, reason}, socket}
    end
  end

  @impl true
  def handle_in("function_response", payload, socket) do
    Logger.info("=== MESSAGE CHANNEL: Received function_response event ===")
    Logger.info("Raw payload: #{inspect(payload)}")
    Logger.info("Socket topic: #{socket.topic}")

    case process_function_response(payload, socket) do
      {:ok, response} ->
        Logger.info("Function response processed successfully: #{inspect(response)}")
        {:reply, {:ok, response}, socket}

      {:error, reason} ->
        Logger.error("Failed to process function response: #{inspect(reason)}")
        {:reply, {:error, reason}, socket}
    end
  end

  @impl true
  def handle_in(event, payload, socket) do
    Logger.info("=== MESSAGE CHANNEL: Received unhandled event ===")
    Logger.info("Event: #{event}")
    Logger.info("Payload: #{inspect(payload)}")
    Logger.info("Socket topic: #{socket.topic}")
    {:noreply, socket}
  end

  # Procesare mesaj și trimitere către AI Agent Server
  defp process_message(%{"businessId" => business_id, "userId" => user_id, "message" => content} = payload, socket) do
    try do
      Logger.info("=== PROCESSING MESSAGE ===")
      Logger.info("Business ID: #{business_id}")
      Logger.info("User ID: #{user_id}")
      Logger.info("Message content: \"#{content}\"")
      Logger.info("Full payload: #{inspect(payload)}")

      # Folosește sessionId furnizat de client; AI Agent Server va genera dacă lipsește
      session_id = payload["sessionId"]
      message_id = generate_message_id()

      Logger.info("Generated session ID: #{session_id}")
      Logger.info("Generated message ID: #{message_id}")

      # Context suplimentar
      context = %{
        businessId: business_id,
        locationId: payload["locationId"] || "default",
        userId: user_id,
        sessionId: session_id,
        source: "websocket",
        timestamp: payload["timestamp"] || DateTime.utc_now() |> DateTime.to_iso8601()
      }

      Logger.info("Context: #{inspect(context)}")

      # Trimitere mesaj către AI Agent Server prin HTTP către WebSocket endpoint
      # Simulăm trimiterea prin ai-agent-server WebSocket endpoint
      case send_to_ai_agent_server(business_id, user_id, session_id, content, context) do
        {:ok, response} ->
          Logger.info("=== MESSAGE FORWARDED SUCCESSFULLY ===")
          Logger.info("AI Agent Server response: #{inspect(response)}")

          # Confirmare că mesajul a fost trimis către AI Agent Server
          {:ok, %{
            status: "forwarded_to_ai_agent",
            sessionId: session_id,
            messageId: message_id,
            message: "Mesajul a fost trimis către AI Agent Server pentru procesare."
          }}

        {:error, error} ->
          Logger.error("=== FAILED TO FORWARD MESSAGE ===")
          Logger.error("Error: #{inspect(error)}")
          {:error, "Failed to forward message: #{error}"}
      end

    rescue
      error ->
        Logger.error("=== ERROR PROCESSING MESSAGE ===")
        Logger.error("Error: #{inspect(error)}")
        {:error, "Internal processing error: #{error}"}
    end
  end

  defp process_message(payload, _socket) do
    Logger.warning("Invalid message payload: #{inspect(payload)}")
    {:error, "Invalid payload format. Required: businessId, userId, message"}
  end

  # Procesare răspuns funcție de la frontend și trimitere către AI Agent Server
  defp process_function_response(%{"businessId" => business_id, "sessionId" => session_id, "functionResponse" => function_response} = payload, _socket) do
    try do
      Logger.info("=== PROCESSING FUNCTION RESPONSE ===")
      Logger.info("Business ID: #{business_id}")
      Logger.info("Session ID: #{session_id}")
      Logger.info("Function response: #{inspect(function_response)}")

      # Trimitere răspuns către AI Agent Server
      case send_function_response_to_ai_agent(business_id, session_id, function_response, payload) do
        {:ok, response} ->
          Logger.info("=== FUNCTION RESPONSE FORWARDED SUCCESSFULLY ===")
          Logger.info("AI Agent Server response: #{inspect(response)}")

          {:ok, %{
            status: "forwarded_to_ai_agent",
            sessionId: session_id,
            message: "Function response was forwarded to AI Agent Server."
          }}

        {:error, error} ->
          Logger.error("=== FAILED TO FORWARD FUNCTION RESPONSE ===")
          Logger.error("Error: #{inspect(error)}")
          {:error, "Failed to forward function response: #{error}"}
      end

    rescue
      error ->
        Logger.error("=== ERROR PROCESSING FUNCTION RESPONSE ===")
        Logger.error("Error: #{inspect(error)}")
        {:error, "Internal processing error: #{error}"}
    end
  end

  defp process_function_response(payload, _socket) do
    Logger.warning("Invalid function response payload: #{inspect(payload)}")
    {:error, "Invalid payload format. Required: businessId, sessionId, functionResponse"}
  end

  # Trimitere răspuns funcție către AI Agent Server
  defp send_function_response_to_ai_agent(business_id, session_id, function_response, payload) do
    try do
      ai_agent_url = Application.get_env(:notification_hub, :ai_agent_http_url, "http://ai-agent-server:3003")
      endpoint_url = "#{ai_agent_url}/agent/frontend-responses"

      Logger.info("=== SENDING FUNCTION RESPONSE TO AI AGENT SERVER ===")
      Logger.info("Target URL: #{endpoint_url}")
      Logger.info("Business ID: #{business_id}")
      Logger.info("Session ID: #{session_id}")
      Logger.info("Function response: #{inspect(function_response)}")

      # Format răspuns pentru AI Agent Server
      response_payload = %{
        tenant_id: business_id,
        session_id: session_id,
        function_response: %{
          success: function_response["success"],
          data: function_response["data"],
          error: function_response["error"],
          functionName: function_response["functionName"],
          timestamp: function_response["timestamp"] || DateTime.utc_now() |> DateTime.to_iso8601()
        },
        timestamp: DateTime.utc_now() |> DateTime.to_iso8601()
      }

      Logger.info("Response payload: #{inspect(response_payload)}")

      case HTTPoison.post(endpoint_url, Jason.encode!(response_payload), [
        {"Content-Type", "application/json"},
        {"User-Agent", "NotificationHub/1.0"}
      ], [timeout: 10000]) do
        {:ok, %HTTPoison.Response{status_code: 200, body: body}} ->
          Logger.info("=== AI AGENT SERVER RESPONSE SUCCESS ===")
          Logger.info("Response body: #{body}")
          parsed_response = Jason.decode!(body)
          Logger.info("Parsed response: #{inspect(parsed_response)}")
          {:ok, parsed_response}

        {:ok, %HTTPoison.Response{status_code: status_code, body: body}} ->
          Logger.error("=== AI AGENT SERVER ERROR RESPONSE ===")
          Logger.error("Status code: #{status_code}")
          Logger.error("Response body: #{body}")
          {:error, "HTTP #{status_code}: #{body}"}

        {:error, error} ->
          Logger.error("=== AI AGENT SERVER CONNECTION ERROR ===")
          Logger.error("Error: #{inspect(error)}")
          {:error, "Connection failed: #{error}"}
      end

    rescue
      error ->
        Logger.error("=== AI AGENT SERVER REQUEST ERROR ===")
        Logger.error("Error: #{inspect(error)}")
        {:error, "Request error: #{error}"}
    end
  end

  # Trimitere mesaj către AI Agent Server prin HTTP
  defp send_to_ai_agent_server(business_id, user_id, session_id, content, context) do
    try do
      ai_agent_url = Application.get_env(:notification_hub, :ai_agent_http_url, "http://ai-agent-server:3003")
      endpoint_url = "#{ai_agent_url}/api/messages"

      Logger.info("=== SENDING TO AI AGENT SERVER ===")
      Logger.info("Target URL: #{endpoint_url}")
      Logger.info("Business ID: #{business_id}")
      Logger.info("User ID: #{user_id}")
      Logger.info("Session ID: #{session_id}")
      Logger.info("Content: \"#{content}\"")

      # Format mesaj pentru AI Agent Server - se potrivește cu MessageRequest interface
      message_payload = %{
        tenant_id: business_id,
        user_id: user_id,
        session_id: session_id,
        message_id: generate_message_id(),
        payload: %{
          content: content,
          context: context
        },
        timestamp: context[:timestamp] || DateTime.utc_now() |> DateTime.to_iso8601()
      }

      Logger.info("Message payload: #{inspect(message_payload)}")

      case HTTPoison.post(endpoint_url, Jason.encode!(message_payload), [
        {"Content-Type", "application/json"},
        {"User-Agent", "NotificationHub/1.0"}
      ], [timeout: 10000]) do
        {:ok, %HTTPoison.Response{status_code: 200, body: body}} ->
          Logger.info("=== AI AGENT SERVER RESPONSE SUCCESS ===")
          Logger.info("Response body: #{body}")
          parsed_response = Jason.decode!(body)
          Logger.info("Parsed response: #{inspect(parsed_response)}")
          {:ok, parsed_response}

        {:ok, %HTTPoison.Response{status_code: status_code, body: body}} ->
          Logger.error("=== AI AGENT SERVER ERROR RESPONSE ===")
          Logger.error("Status code: #{status_code}")
          Logger.error("Response body: #{body}")
          {:error, "HTTP #{status_code}: #{body}"}

        {:error, error} ->
          Logger.error("=== AI AGENT SERVER CONNECTION ERROR ===")
          Logger.error("Error: #{inspect(error)}")
          {:error, "Connection failed: #{error}"}
      end

    rescue
      error ->
        Logger.error("=== AI AGENT SERVER REQUEST ERROR ===")
        Logger.error("Error: #{inspect(error)}")
        {:error, "Request error: #{error}"}
    end
  end

  # Handler pentru răspunsurile AI primite de la AI Agent Server
  @impl true
  def handle_info(%Phoenix.Socket.Broadcast{event: "new_message", payload: ai_response}, socket) do
    Logger.info("Received AI response from AI Agent Server: #{inspect(ai_response)}")

    # Trimite răspunsul AI către clientul WebSocket
    push(socket, "new_message", %{
      responseId: ai_response["responseId"] || ai_response["messageId"],
      message: ai_response["message"] || ai_response["content"],
      timestamp: ai_response["timestamp"] || DateTime.utc_now() |> DateTime.to_iso8601(),
      sessionId: ai_response["sessionId"],
      actions: ai_response["actions"] || []
    })

    {:noreply, socket}
  end

  # Handler pentru mesaje directe de la AI Agent Server
  @impl true
  def handle_info({:ai_response, ai_response}, socket) do
    Logger.info("Received direct AI response: #{inspect(ai_response)}")

    # Trimite răspunsul AI către clientul WebSocket
    push(socket, "new_message", %{
      responseId: ai_response["responseId"] || ai_response["messageId"],
      message: ai_response["message"] || ai_response["content"],
      timestamp: ai_response["timestamp"] || DateTime.utc_now() |> DateTime.to_iso8601(),
      sessionId: ai_response["sessionId"],
      actions: ai_response["actions"] || []
    })

    {:noreply, socket}
  end

  # Handler pentru apeluri funcții frontend de la AI
  @impl true
  def handle_info(%Phoenix.Socket.Broadcast{event: "ai_function_call", payload: function_call}, socket) do
    Logger.info("Received AI function call: #{inspect(function_call)}")

    # Trimite apelul de funcție către frontend
    push(socket, "ai_function_call", %{
      functionName: function_call["functionName"],
      parameters: function_call["parameters"],
      timestamp: function_call["timestamp"]
    })

    {:noreply, socket}
  end

  # Generare ID sesiune
  defp generate_session_id(business_id, user_id) do
    # Stabil per zi: aceeași sesiune pentru (tenant, user) în acea zi
    date_str = Date.utc_today() |> Date.to_iso8601()
    "#{business_id}:#{user_id}:#{date_str}"
  end

  # Generare ID mesaj
  defp generate_message_id do
    timestamp = DateTime.utc_now() |> DateTime.to_unix()
    random = :crypto.strong_rand_bytes(8) |> Base.encode16(case: :lower)
    "msg_#{timestamp}_#{random}"
  end
end
