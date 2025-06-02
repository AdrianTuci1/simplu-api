defmodule KafkaConsumer.Broadway do
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

    Broadway.start_link(__MODULE__,
      name: __MODULE__,
      producer: [
        module: {BroadwayKafka.Producer, [
          hosts: brokers,
          group_id: System.get_env("KAFKA_GROUP_ID", "elixir-consumer-group"),
          client_id: System.get_env("KAFKA_CLIENT_ID", "elixir-consumer"),
          topics: ["reservations"],
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
          concurrency: 10
        ]
      ],
      batchers: [
        default: [
          batch_size: 100,
          batch_timeout: 50,
          concurrency: 5
        ]
      ]
    )
  end

  @impl true
  def handle_message(_, message, _) do
    # Process the message here
    # You can access the message data using message.data
    # You can access the metadata using message.metadata

    # Example: Log the message
    Logger.info("Received message: #{inspect(message.data)}")

    # Example: Parse JSON if the message is in JSON format
    case Jason.decode(message.data) do
      {:ok, decoded} ->
        Logger.info("Decoded message: #{inspect(decoded)}")
        # Here you can handle different event types
        case decoded do
          %{"type" => "reservation.created", "data" => data} ->
            Logger.info("New reservation created: #{inspect(data)}")
          %{"type" => "reservation.status_updated", "data" => data} ->
            Logger.info("Reservation status updated: #{inspect(data)}")
          _ ->
            Logger.warn("Unknown event type")
        end
      {:error, reason} ->
        Logger.error("Failed to decode message: #{inspect(reason)}")
    end

    message
  end

  @impl true
  def handle_batch(_, messages, _, _) do
    # Process the batch of messages here
    # You can access all messages in the batch using messages

    # Example: Log the batch size
    Logger.info("Processing batch of #{length(messages)} messages")

    messages
  end
end
