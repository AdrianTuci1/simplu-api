defmodule KafkaConsumer.ReservationsConsumer do
  use Broadway

  alias Broadway.Message

  def start_link(_opts) do
    Broadway.start_link(__MODULE__,
      name: __MODULE__,
      producer: [
        module: {BroadwayKafka.Producer, [
          hosts: [localhost: 9092],
          group_id: System.get_env("KAFKA_GROUP_ID", "elixir-consumer-group"),
          topics: ["reservations"]
        ]},
        concurrency: 1
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
    case Jason.decode(message.data) do
      {:ok, data} ->
        # Process reservation message
        Logger.info("Processing reservation: #{inspect(data)}")
        Message.put_data(message, Jason.encode!(data))
      {:error, reason} ->
        Logger.error("Failed to decode reservation message: #{inspect(reason)}")
        Message.failed(message, "Invalid JSON format")
    end
  end

  @impl true
  def handle_batch(_, messages, _, _) do
    messages
  end
end
