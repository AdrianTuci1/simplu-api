defmodule NotificationHub.AiAgentClient do
  require Logger

  @doc """
  Send a message to the AI agent via gRPC
  """
  def send_message(tenant_id, user_id, session_id, message_id, content, context \\ %{}) do
    try do
      # Get AI agent gRPC URL from config
      ai_agent_url = Application.get_env(:notification_hub, :ai_agent_grpc_url, "ai-agent-server:50051")

      # Create gRPC channel
      {:ok, channel} = GRPC.Stub.connect(ai_agent_url)

      # Create message request
      request = Messages.MessageRequest.new(
        tenant_id: tenant_id,
        user_id: user_id,
        session_id: session_id,
        message_id: message_id,
        content: content,
        context: context,
        timestamp: :os.system_time(:millisecond)
      )

      # Send message to AI agent
      case Messages.MessageService.Stub.send_message(channel, request) do
        {:ok, response} ->
          Logger.info("Successfully sent message to AI agent: #{inspect(response)}")
          {:ok, response}

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

  @doc """
  Start streaming messages from AI agent
  """
  def start_stream(tenant_id, user_id, session_id) do
    try do
      # Get AI agent gRPC URL from config
      ai_agent_url = Application.get_env(:notification_hub, :ai_agent_grpc_url, "ai-agent-server:50051")

      # Create gRPC channel
      {:ok, channel} = GRPC.Stub.connect(ai_agent_url)

      # Create stream request
      request = Messages.StreamRequest.new(
        tenant_id: tenant_id,
        user_id: user_id,
        session_id: session_id
      )

      # Start streaming
      case Messages.MessageService.Stub.stream_messages(channel, request) do
        {:ok, stream} ->
          Logger.info("Started message stream with AI agent")
          {:ok, stream}

        {:error, error} ->
          Logger.error("Failed to start stream with AI agent: #{inspect(error)}")
          {:error, error}
      end
    rescue
      error ->
        Logger.error("Error starting stream with AI agent: #{inspect(error)}")
        {:error, error}
    end
  end
end
