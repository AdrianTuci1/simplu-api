import Config

config :logger, :console,
  format: "$time $metadata[$level] $message\n",
  metadata: [:request_id]

brokers =
  System.get_env("KAFKA_BROKERS", "kafka:9092")
  |> String.split(",")
  |> Enum.map(fn broker ->
    [host, port] = String.split(broker, ":")
    "#{host}:#{port}"
  end)
  |> Enum.join(",")

config :kafka_consumer, BroadwayKafka,
  producer: [
    module: {BroadwayKafka.Producer, [
      hosts: brokers,
      group_id: System.get_env("KAFKA_GROUP_ID", "elixir-consumer-group"),
      client_id: System.get_env("KAFKA_CLIENT_ID", "elixir-consumer"),
      topics: ["reservations"],  # Replace with your actual topic
      group_config: [
        offset_commit_interval_seconds: 5,
        session_timeout_seconds: 30
      ],
      consumer_config: [
        begin_offset: :earliest,
        max_bytes: 1_000_000,
        max_wait_time: 10_000,
        min_bytes: 1
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
