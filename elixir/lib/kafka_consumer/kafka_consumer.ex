defmodule KafkaConsumer.ConversationsConsumer do
  use Broadway

  alias Broadway.Message
  require Logger

  def start_link(_opts) do
    brokers = System.get_env("KAFKA_BROKERS", "kafka:29092")
    |> String.split(",")
    |> Enum.map(fn broker ->
      [host, port] = String.split(broker, ":")
      {String.to_atom(host), String.to_integer(port)}
    end)

    consumer_topic = System.get_env("KAFKA_CONSUMER_TOPIC", "agent.to.elixir")
    Logger.info("Starting consumer with topic: #{consumer_topic}")

    Broadway.start_link(__MODULE__,
      name: __MODULE__,
      producer: [
        module: {BroadwayKafka.Producer, [
          hosts: brokers,
          group_id: System.get_env("KAFKA_GROUP_ID", "elixir-consumer-group"),
          client_id: System.get_env("KAFKA_CLIENT_ID", "elixir-consumer"),
          topics: [consumer_topic],
          group_config: [
            offset_commit_interval_seconds: 5,
            session_timeout_seconds: 30,
            rebalance_timeout_seconds: 60
          ],
          consumer_config: [
            begin_offset: :earliest,
            max_bytes: 1_000_000,
            max_wait_time: 10_000,
            min_bytes: 1,
            connect_timeout: 30_000,
            request_timeout: 30_000,
            retry_count: 10,
            retry_delay: 5_000
          ]
        ]}
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
        Logger.info("Received agent response: #{inspect(data)}")

        # Process based on message type
        case data do
          %{"type" => "agent.response", "payload" => payload, "messageId" => message_id} ->
            Logger.info("Processing agent response for message #{message_id}")

            # Here you can add your business logic for handling the agent response
            # For example, you might want to:
            # 1. Update a conversation in the database
            # 2. Send a notification
            # 3. Trigger another process
            # 4. etc.

            # For now, we'll just log the response content
            Logger.info("Agent response content: #{inspect(payload["content"])}")

            # Mark the message as successful
            Message.put_data(message, Jason.encode!(data))

          _ ->
            Logger.warn("Unknown message type: #{inspect(data["type"])}")
            Message.failed(message, "Unknown message type")
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
end
