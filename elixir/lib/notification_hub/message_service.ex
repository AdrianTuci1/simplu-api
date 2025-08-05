defmodule NotificationHub.MessageService do
  use GRPC.Server, service: Messages.MessageService.Service
  require Logger

  alias NotificationHubWeb.Endpoint

  @impl true
  def send_message(request, _stream) do
    Logger.info("Received message from AI agent: #{inspect(request)}")

    # Extract message data
    %{
      tenant_id: tenant_id,
      user_id: user_id,
      session_id: session_id,
      message_id: message_id,
      content: content,
      context: context,
      timestamp: timestamp
    } = request

    # Broadcast to WebSocket channel
    channel_topic = "messages:#{tenant_id}"
    Endpoint.broadcast(channel_topic, "new_message", %{
      message_id: message_id,
      content: content,
      context: context,
      user_id: user_id,
      session_id: session_id,
      timestamp: timestamp,
      role: "agent"
    })

    Logger.info("Broadcasted message to channel: #{channel_topic}")

    # Return response
    Messages.MessageResponse.new(
      tenant_id: tenant_id,
      user_id: user_id,
      session_id: session_id,
      message_id: message_id,
      content: "Message received and broadcasted",
      timestamp: :os.system_time(:millisecond),
      status: "success"
    )
  end

  @impl true
  def stream_messages(request, stream) do
    Logger.info("Starting message stream for: #{inspect(request)}")

    # This would be used for streaming responses from AI agent
    # For now, we'll just acknowledge the stream request
    response = Messages.MessageResponse.new(
      tenant_id: request.tenant_id,
      user_id: request.user_id,
      session_id: request.session_id,
      message_id: "stream_start",
      content: "Stream started",
      timestamp: :os.system_time(:millisecond),
      status: "stream_active"
    )

    GRPC.Server.send_reply(stream, response)
  end
end
