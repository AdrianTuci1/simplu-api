defmodule NotificationHubWeb.Endpoint do
  use Phoenix.Endpoint, otp_app: :notification_hub

  # The session will be stored in the cookie and signed,
  # this means its contents can be read but not tampered with.
  # Set :encryption_salt if you would also like to encrypt it.
  @session_options [
    store: :cookie,
    key: "_notification_hub_key",
    signing_salt: System.get_env("EXS_SECRET", "temporary-signing-salt"),
    same_site: "Lax"
  ]

  socket "/socket", NotificationHubWeb.UserSocket,
    websocket: [check_origin: false, timeout: 120_000],
    longpoll: false

  socket "/live", Phoenix.LiveView.Socket,
    websocket: [connect_info: [session: @session_options], check_origin: false]

  # Serve at "/" the static files from "priv/static" directory.
  plug Plug.Static,
    at: "/",
    from: :notification_hub,
    gzip: false,
    only: NotificationHubWeb.static_paths()

  # Code reloading can be explicitly enabled under the
  # :code_reloader configuration of your endpoint.
  if code_reloading? and Mix.env() == :dev do
    socket "/phoenix/live_reload/socket", Phoenix.LiveReloader.Socket
    plug Phoenix.LiveReloader
    plug Phoenix.CodeReloader
  end

  plug Plug.RequestId
  plug Plug.Telemetry, event_prefix: [:phoenix, :endpoint]

  plug Plug.Parsers,
    parsers: [:urlencoded, :multipart, :json],
    pass: ["*/*"],
    json_decoder: Phoenix.json_library()

  plug Plug.MethodOverride
  plug Plug.Head
  plug Plug.Session, @session_options
  plug CORSPlug
  plug NotificationHubWeb.Router

  defp check_origin do
    case Mix.env() do
      :prod -> ["https://yourdomain.com"]
      _ -> :check_origin
    end
  end
end
