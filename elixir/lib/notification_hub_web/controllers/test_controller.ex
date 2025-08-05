defmodule NotificationHubWeb.TestController do
  use NotificationHubWeb, :controller

  def index(conn, _params) do
    conn
    |> put_resp_content_type("text/html")
    |> send_file(200, Path.join(:code.priv_dir(:notification_hub), "static/test-client.html"))
  end
end
