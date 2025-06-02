defmodule KafkaConsumerWeb.ErrorController do
  use KafkaConsumerWeb, :controller

  def not_found(conn, _params) do
    conn
    |> put_status(:not_found)
    |> put_view(html: KafkaConsumerWeb.ErrorComponent)
    |> render("404.html")
  end

  def internal_server_error(conn, _params) do
    conn
    |> put_status(:internal_server_error)
    |> put_view(html: KafkaConsumerWeb.ErrorComponent)
    |> render("500.html")
  end
end
