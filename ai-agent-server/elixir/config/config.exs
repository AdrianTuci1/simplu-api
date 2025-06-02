import Config

# Configure Kafka
config :kafka_ex,
  brokers: [
    %{
      host: System.get_env("KAFKA_HOST", "localhost"),
      port: String.to_integer(System.get_env("KAFKA_PORT", "9092"))
    }
  ],
  consumer_group: "agent-consumer-group",
  consumer_group_update_interval: 1000,
  max_bytes_per_partition: 1_000_000,
  max_wait_time: 10_000,
  min_bytes: 1,
  offset_commit_interval: 5_000,
  offset_commit_threshold: 100,
  rebalance_delay_max: 2_000,
  rebalance_delay_ms: 500,
  session_timeout: 30_000,
  start_with_earliest_message: true

# Configure Logger
config :logger,
  level: :info,
  format: "$time $metadata[$level] $message\n",
  metadata: [:request_id, :tenant_id]

# Configure the application
config :agent_consumer,
  # Add your application-specific configuration here
  event_handlers: [
    response: AgentConsumer.Handlers.ResponseHandler,
    suggestion: AgentConsumer.Handlers.SuggestionHandler,
    consultation: AgentConsumer.Handlers.ConsultationHandler,
    decision: AgentConsumer.Handlers.DecisionHandler
  ],
  notification_channels: [
    email: AgentConsumer.Notifications.EmailNotifier,
    slack: AgentConsumer.Notifications.SlackNotifier,
    webhook: AgentConsumer.Notifications.WebhookNotifier
  ]
