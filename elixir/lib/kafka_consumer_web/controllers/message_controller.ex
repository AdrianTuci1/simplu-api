defmodule KafkaConsumerWeb.MessageController do
  use KafkaConsumerWeb, :controller

  def create(conn, %{"tenant_id" => tenant_id} = params) do
    case KafkaConsumer.AgentPublisher.publish_message(tenant_id, params) do
      {:ok, message} ->
        conn
        |> put_status(:ok)
        |> json(%{status: "success", message: message})

      {:error, reason} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{status: "error", message: reason})
    end
  end

  def create(conn, _params) do
    conn
    |> put_status(:bad_request)
    |> json(%{status: "error", message: "tenant_id is required"})
  end
end
