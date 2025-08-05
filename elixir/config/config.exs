import Config

config :logger,
  level: :info,
  format: "$time [$level] $message\n",
  backends: [:console]

# Phoenix configuration
config :notification_hub, NotificationHubWeb.Endpoint,
  url: [host: "0.0.0.0"],
  http: [port: 4000],
  server: true,
  secret_key_base: System.get_env("EXS_SECRET", "temporary-secret-key-for-development-only"),
  live_view: [
    signing_salt: System.get_env("EXS_SECRET", "temporary-signing-salt")
  ],
  pubsub_server: NotificationHub.PubSub,
  code_reloader: true,
  check_origin: ["http://localhost:5173"],
  render_errors: [
    formats: [json: NotificationHubWeb.ErrorJSON],
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

# gRPC configuration for AI agent communication
config :grpc, start_server: true

config :notification_hub,
  grpc_port: String.to_integer(System.get_env("GRPC_PORT", "50051")),
  ai_agent_grpc_url: System.get_env("AI_AGENT_GRPC_URL", "ai-agent-server:50051")
