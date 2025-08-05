defmodule NotificationHubWeb.MessageController do
  use NotificationHubWeb, :controller
  require Logger

  alias NotificationHub.AiAgentClient

  def create(conn, params) do
    Logger.info("Received message from frontend: #{inspect(params)}")

    # Extract message parameters
    tenant_id = params["tenant_id"] || params["tenantId"]
    user_id = params["user_id"] || params["userId"]
    session_id = params["session_id"] || params["sessionId"]
    message_id = params["message_id"] || params["messageId"] || UUID.uuid4()

    payload = params["payload"] || %{}
    content = payload["content"] || params["content"]
    context = payload["context"] || params["context"] || %{}

    # Validate required parameters
    if !tenant_id || !user_id || !content do
      conn
      |> put_status(:bad_request)
      |> json(%{
        status: "error",
        message: "Missing required parameters: tenant_id, user_id, content"
      })
    else
      # Send message to AI agent via gRPC
      case AiAgentClient.send_message(tenant_id, user_id, session_id, message_id, content, context) do
        {:ok, response} ->
          Logger.info("Successfully sent message to AI agent")

          json(conn, %{
            status: "success",
            message: %{
              tenantId: tenant_id,
              userId: user_id,
              sessionId: session_id,
              messageId: message_id,
              type: "user.message",
              payload: %{
                content: content,
                context: context
              },
              timestamp: DateTime.utc_now() |> DateTime.to_iso8601()
            }
          })

        {:error, error} ->
          Logger.error("Failed to send message to AI agent: #{inspect(error)}")

          conn
          |> put_status(:internal_server_error)
          |> json(%{
            status: "error",
            message: "Failed to send message to AI agent"
          })
      end
    end
  end
end
