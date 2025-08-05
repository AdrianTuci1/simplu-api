defmodule NotificationHub.Application do
  use Application

  @impl true
  def start(_type, _args) do
    children = [
      {Phoenix.PubSub, name: NotificationHub.PubSub},
      # gRPC server for AI agent communication
      {GRPC.Server.Supervisor, {NotificationHub.GrpcEndpoint, 50051}},
      NotificationHubWeb.Endpoint
    ]

    opts = [strategy: :one_for_one, name: NotificationHub.Supervisor]
    Supervisor.start_link(children, opts)
  end
end
