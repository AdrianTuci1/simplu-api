defmodule KafkaConsumer.ConversationsConsumer do
  use Broadway

  alias Broadway.Message
  alias KafkaConsumer.MessageProcessor

  def start_link(_opts) do
    Broadway.start_link(__MODULE__,
      name: __MODULE__,
      producer: [
        module: {BroadwayKafka.Producer, [
          hosts: [localhost: 9092],
          group_id: "ai-agent-group",
          topics: ["conversations"]
        ]},
        concurrency: 1
      ],
      processors: [
        default: [
          concurrency: 1
        ]
      ],
      batchers: [
        default: [
          batch_size: 1,
          batch_timeout: 50,
          concurrency: 1
        ]
      ]
    )
  end

  @impl true
  def handle_message(_, message, _) do
    case Jason.decode(message.data) do
      {:ok, data} ->
        case validate_message(data) do
          :ok ->
            process_message(message, data)
          {:error, reason} ->
            Logger.warning("Invalid message received: #{inspect(reason)}")
            Message.failed(message, reason)
        end
      {:error, reason} ->
        Logger.error("Failed to decode message: #{inspect(reason)}")
        Message.failed(message, "Invalid JSON format")
    end
  end

  @impl true
  def handle_batch(_, messages, _, _) do
    messages
  end

  defp validate_message(%{
    "conversationId" => conversation_id,
    "messageId" => message_id,
    "userId" => user_id,
    "content" => content
  }) when is_binary(conversation_id) and is_binary(message_id) and
         is_binary(user_id) and is_binary(content) do
    :ok
  end
  defp validate_message(_), do: {:error, "Missing required fields"}

  defp process_message(message, data) do
    # Process the message using MessageProcessor
    case MessageProcessor.process_message(data) do
      {:ok, processed_data} ->
        response = %{
          "conversationId" => data["conversationId"],
          "messageId" => data["messageId"],
          "userId" => data["userId"],
          "status" => "received",
          "timestamp" => DateTime.utc_now() |> DateTime.to_iso8601(),
          "metadata" => %{
            "processed" => true,
            "source" => "ai-agent-server"
          }
        }

        # Send response to agent.events topic
        case MessageProcessor.send_response(response) do
          {:ok, _} ->
            Message.put_data(message, Jason.encode!(response))
          {:error, reason} ->
            Logger.error("Failed to send response: #{inspect(reason)}")
            Message.failed(message, "Failed to send response")
        end

      {:error, reason} ->
        Logger.error("Failed to process message: #{inspect(reason)}")
        Message.failed(message, "Failed to process message")
    end
  end
end
