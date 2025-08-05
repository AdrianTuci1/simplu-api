defmodule NotificationHub.GrpcEndpoint do
  use GRPC.Endpoint

  intercept GRPC.Logger.Server
  run NotificationHub.MessageService
end
