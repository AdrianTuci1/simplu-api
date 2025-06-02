defmodule KafkaConsumerWeb.MessageController do
  use KafkaConsumerWeb, :controller

  def create(conn, %{"tenant_id" => tenant_id, "userId" => user_id, "sessionId" => session_id, "payload" => payload} = params) do
    # Validăm că payload-ul conține content și context
    case validate_payload(payload) do
      :ok ->
        case KafkaConsumer.AgentPublisher.publish_message(tenant_id, user_id, session_id, payload) do
          {:ok, message} ->
            conn
            |> put_status(:ok)
            |> json(%{status: "success", message: message})

          {:error, reason} ->
            conn
            |> put_status(:unprocessable_entity)
            |> json(%{status: "error", message: reason})
        end
      :error ->
        conn
        |> put_status(:bad_request)
        |> json(%{status: "error", message: "Invalid payload format"})
    end
  end

  def create(conn, _params) do
    conn
    |> put_status(:bad_request)
    |> json(%{status: "error", message: "tenant_id, userId, sessionId and payload are required"})
  end

  defp validate_payload(%{"content" => content, "context" => context})
       when is_binary(content) and is_map(context) do
    :ok
  end
  defp validate_payload(_), do: :error
end
