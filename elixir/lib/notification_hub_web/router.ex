defmodule NotificationHubWeb.Router do
  use NotificationHubWeb, :router

  pipeline :browser do
    plug :accepts, ["html"]
    plug :put_secure_browser_headers
  end

  pipeline :api do
    plug :accepts, ["json"]
    plug CORSPlug,
      origin: :check_origin,
      max_age: 86400,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
  end

  scope "/api", NotificationHubWeb do
    pipe_through :api

    # Endpoint for receiving messages from frontend to send to AI agent
    post "/messages", MessageController, :create

    # Endpoint for receiving AI responses from ai-agent-server
    post "/ai-responses", AiResponsesController, :create

    # Endpoint for receiving resource notifications from resources-server
    post "/notifications", NotificationsController, :create

    # Health check
    get "/health", HealthController, :check
  end

  scope "/", NotificationHubWeb do
    pipe_through :browser

    # Test client for WebSocket connections
    get "/test", TestController, :index
  end

  # Health check endpoint (also available without /api prefix)
  get "/health", NotificationHubWeb.HealthController, :check
end
