defmodule NotificationHubWeb.HealthController do
  use NotificationHubWeb, :controller

  def check(conn, _params) do
    json(conn, %{
      status: "ok",
      service: "notification-hub",
      timestamp: DateTime.utc_now() |> DateTime.to_iso8601(),
      ai_agent_url: Application.get_env(:notification_hub, :ai_agent_http_url, "http://ai-agent-server:3000")
    })
  end
end
