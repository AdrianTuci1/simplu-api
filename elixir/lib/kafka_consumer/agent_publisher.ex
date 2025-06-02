defmodule KafkaConsumer.AgentPublisher do
  use Broadway

  require Logger

  def child_spec(opts) do
    %{
      id: __MODULE__,
      start: {__MODULE__, :start_link, [opts]},
      type: :worker,
      restart: :permanent,
      shutdown: 500
    }
  end

  def start_link(_opts) do
    brokers = System.get_env("KAFKA_BROKERS", "kafka:29092")
    |> String.split(",")
    |> Enum.map(fn broker ->
      [host, port] = String.split(broker, ":")
      {String.to_atom(host), String.to_integer(port)}
    end)

    publisher_topic = System.get_env("KAFKA_PUBLISHER_TOPIC", "elixir.to.agent")
    Logger.info("Starting publisher with topic: #{publisher_topic}")

    # Start brod client
    :ok = :brod.start_client(brokers, :kafka_client, [])
    :ok = :brod.start_producer(:kafka_client, publisher_topic, [])

    Broadway.start_link(__MODULE__,
      name: __MODULE__,
      producer: [
        module: {BroadwayKafka.Producer, [
          hosts: brokers,
          group_id: System.get_env("KAFKA_PUBLISHER_GROUP_ID", "elixir-publisher-group"),
          client_id: System.get_env("KAFKA_PUBLISHER_CLIENT_ID", "elixir-publisher"),
          topics: [publisher_topic],
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

  def publish_message(tenant_id, user_id, session_id, payload) when is_binary(tenant_id) do
    message_id = UUID.uuid4()
    timestamp = DateTime.utc_now() |> DateTime.to_iso8601()

    # Construim mesajul pentru Kafka care include:
    # - tenantId, userId, sessionId pentru identificare
    # - messageId generat unic pentru fiecare mesaj
    # - type: "user.message" pentru a indica tipul mesajului
    # - payload: conține atât content cât și context pentru a păstra istoricul conversației
    # - timestamp: momentul trimiterii mesajului
    event = %{
      tenantId: tenant_id,
      userId: user_id,
      sessionId: session_id,
      messageId: message_id,
      type: "user.message",
      payload: payload,
      timestamp: timestamp
    }

    publisher_topic = System.get_env("KAFKA_PUBLISHER_TOPIC", "elixir.to.agent")

    # Broadcast to WebSocket channel
    KafkaConsumerWeb.Endpoint.broadcast("messages:#{tenant_id}", "new_message", %{
      message_id: message_id,
      content: payload["content"],
      context: payload["context"],
      userId: user_id,
      sessionId: session_id,
      timestamp: timestamp
    })

    # Publish to Kafka using brod directly
    case :brod.produce_sync(
      :kafka_client,
      publisher_topic,
      0,
      "#{tenant_id}:#{session_id}",
      Jason.encode!(event)
    ) do
      :ok -> {:ok, event}
      error -> {:error, error}
    end
  end

  @impl true
  def handle_message(_, message, _) do
    Logger.info("Published message to agent: #{inspect(message.data)}")
    message
  end

  @impl true
  def handle_batch(_, messages, _, _) do
    messages
  end
end
