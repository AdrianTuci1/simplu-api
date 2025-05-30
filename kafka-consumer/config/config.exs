import Config

config :kafka_consumer,
  kafka_brokers: System.get_env("KAFKA_BROKERS", "localhost:9092") |> String.split(",")

config :logger,
  level: :info,
  format: "$time [$level] $message\n",
  backends: [:console]

brokers =
  System.get_env("KAFKA_BROKERS", "kafka:9092")
  |> String.split(",")
  |> Enum.map(fn broker ->
    [host, port] = String.split(broker, ":")
    "#{host}:#{port}"
  end)
  |> Enum.join(",")

# Configuration for reservations topic
config :kafka_consumer, BroadwayKafka.Reservations,
  producer: [
    module: {BroadwayKafka.Producer, [
      hosts: brokers,
      group_id: System.get_env("KAFKA_GROUP_ID", "elixir-consumer-group"),
      client_id: System.get_env("KAFKA_CLIENT_ID", "elixir-consumer"),
      topics: ["reservations"],
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

# Configuration for conversations topic (input)
config :kafka_consumer, BroadwayKafka.Conversations,
  producer: [
    module: {BroadwayKafka.Producer, [
      hosts: brokers,
      group_id: System.get_env("KAFKA_GROUP_ID", "elixir-consumer-group"),
      client_id: System.get_env("KAFKA_CLIENT_ID", "elixir-consumer"),
      topics: ["conversations"],
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

# Configuration for agent.events topic (output)
config :kafka_consumer, BroadwayKafka.AgentEvents,
  producer: [
    module: {BroadwayKafka.Producer, [
      hosts: brokers,
      group_id: System.get_env("KAFKA_GROUP_ID", "elixir-consumer-group"),
      client_id: System.get_env("KAFKA_CLIENT_ID", "elixir-consumer"),
      topics: ["agent.events"],
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
