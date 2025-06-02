import Config

# Configure your database
config :kafka_consumer, KafkaConsumer.Repo,
  username: "postgres",
  password: "postgres",
  hostname: "localhost",
  database: "kafka_consumer_dev",
  stacktrace: true,
  show_sensitive_data_on_connection_error: true,
  pool_size: 10

# For development, we disable any cache and enable
# debugging and code reloading.
#
# The watchers configuration can be used to run external
# watchers to your application. For example, we can use it
# to bundle .js and .css sources.
config :kafka_consumer, KafkaConsumerWeb.Endpoint,
  # Binding to loopback ipv4 address prevents access from other machines.
  # Change to `ip: {0, 0, 0, 0}` to allow access from other machines.
  http: [ip: {0, 0, 0, 0}, port: 4000],
  check_origin: false,
  code_reloader: true,
  debug_errors: true,
  secret_key_base: System.get_env("EXS_SECRET", "temporary-secret-key-for-development-only"),
  watchers: [],
  cors: [
    allowed_origins: ["*"],
    allowed_methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowed_headers: ["*"],
    max_age: 86400,
    credentials: true
  ]

# Kafka configuration
config :kafka_consumer,
  kafka_brokers: System.get_env("KAFKA_BROKERS", "kafka:29092")
    |> String.split(",")
    |> Enum.map(fn broker ->
      [host, port] = String.split(broker, ":")
      {String.to_atom(host), String.to_integer(port)}
    end),
  kafka_group_id: System.get_env("KAFKA_GROUP_ID", "elixir-consumer-group"),
  kafka_client_id: System.get_env("KAFKA_CLIENT_ID", "elixir-consumer"),
  kafka_publisher_group_id: System.get_env("KAFKA_PUBLISHER_GROUP_ID", "elixir-publisher-group"),
  kafka_publisher_client_id: System.get_env("KAFKA_PUBLISHER_CLIENT_ID", "elixir-publisher"),
  kafka_publisher_topic: System.get_env("KAFKA_PUBLISHER_TOPIC", "elixir.to.agent"),
  kafka_consumer_topic: System.get_env("KAFKA_CONSUMER_TOPIC", "agent.to.elixir")

# Do not include metadata nor timestamps in development logs
config :logger, :console, format: "[$level] $message\n"

# Set a higher stacktrace during development. Avoid configuring such
# in production as building large stacktraces may be expensive.
config :phoenix, :stacktrace_depth, 20

# Initialize plugs at runtime for faster development compilation
config :phoenix, :plug_init_mode, :runtime
