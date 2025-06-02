import Config

config :kafka_consumer,
  kafka_brokers: System.get_env("KAFKA_BROKERS", "kafka:29092")
    |> String.split(",")
    |> Enum.map(fn broker ->
      [host, port] = String.split(broker, ":")
      {String.to_atom(host), String.to_integer(port)}
    end)

config :logger,
  level: :info,
  format: "$time [$level] $message\n",
  backends: [:console]

# Phoenix configuration
config :kafka_consumer, KafkaConsumerWeb.Endpoint,
  url: [host: "0.0.0.0"],
  http: [port: 4000],
  server: true,
  secret_key_base: System.get_env("EXS_SECRET", "temporary-secret-key-for-development-only"),
  live_view: [
    signing_salt: System.get_env("EXS_SECRET", "temporary-signing-salt")
  ],
  pubsub_server: KafkaConsumer.PubSub,
  code_reloader: true,
  check_origin: ["http://localhost:5173"],
  render_errors: [
    formats: [json: KafkaConsumerWeb.ErrorJSON],
    layout: false
  ],
  cors: [
    allowed_origins: ["http://localhost:5173"],
    allowed_methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowed_headers: ["*"],
    max_age: 86400,
    credentials: true
  ]

# Configure Phoenix LiveView
config :phoenix_live_view,
  signing_salt: System.get_env("EXS_SECRET", "temporary-signing-salt")

# Configuration for reservations topic
config :kafka_consumer, BroadwayKafka.Reservations,
  producer: [
    module: {BroadwayKafka.Producer, [
      hosts: Application.get_env(:kafka_consumer, :kafka_brokers),
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

# Configuration for agent.to.elixir topic (input from AI Agent)
config :kafka_consumer, BroadwayKafka.AgentResponses,
  producer: [
    module: {BroadwayKafka.Producer, [
      hosts: Application.get_env(:kafka_consumer, :kafka_brokers),
      group_id: System.get_env("KAFKA_GROUP_ID", "elixir-consumer-group"),
      client_id: System.get_env("KAFKA_CLIENT_ID", "elixir-consumer"),
      topics: [System.get_env("KAFKA_CONSUMER_TOPIC", "agent.to.elixir")],
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

# Configuration for elixir.to.agent topic (output to AI Agent)
config :kafka_consumer, BroadwayKafka.AgentRequests,
  producer: [
    module: {BroadwayKafka.Producer, [
      hosts: Application.get_env(:kafka_consumer, :kafka_brokers),
      group_id: System.get_env("KAFKA_PUBLISHER_GROUP_ID", "elixir-publisher-group"),
      client_id: System.get_env("KAFKA_PUBLISHER_CLIENT_ID", "elixir-publisher"),
      topics: [System.get_env("KAFKA_PUBLISHER_TOPIC", "elixir.to.agent")],
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
