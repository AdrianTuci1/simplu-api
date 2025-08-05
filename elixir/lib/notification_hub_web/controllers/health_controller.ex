defmodule NotificationHubWeb.HealthController do
  use NotificationHubWeb, :controller

  def check(conn, _params) do
    json(conn, %{
      status: "ok",
      service: "notification-hub",
      timestamp: DateTime.utc_now() |> DateTime.to_iso8601(),
      grpc_port: Application.get_env(:notification_hub, :grpc_port, 50051)
    })
  end
end
