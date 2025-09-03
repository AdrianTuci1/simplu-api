import Config

# For development, we disable any cache and enable
# debugging and code reloading.
config :notification_hub, NotificationHubWeb.Endpoint,
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

# HTTP configuration for development
config :notification_hub,
  ai_agent_http_url: System.get_env("AI_AGENT_HTTP_URL", "http://localhost:3003")

# Do not include metadata nor timestamps in development logs
config :logger, :console, format: "[$level] $message\n"

# Set a higher stacktrace during development. Avoid configuring such
# in production as building large stacktraces may be expensive.
config :phoenix, :stacktrace_depth, 20

# Initialize plugs at runtime for faster development compilation
config :phoenix, :plug_init_mode, :runtime
