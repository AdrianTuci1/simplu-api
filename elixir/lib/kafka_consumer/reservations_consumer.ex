defmodule KafkaConsumer.ReservationsConsumer do
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
