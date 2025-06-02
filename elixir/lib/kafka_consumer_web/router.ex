defmodule KafkaConsumerWeb.Router do
  use KafkaConsumerWeb, :router

  pipeline :browser do
    plug :accepts, ["html"]
    plug :fetch_session
    plug :fetch_live_flash
    plug :put_root_layout, html: {KafkaConsumerWeb.Layouts, :root}
    plug :protect_from_forgery
    plug :put_secure_browser_headers
  end

  pipeline :api do
    plug :accepts, ["json"]
  end

  scope "/api", KafkaConsumerWeb do
    pipe_through :api

    post "/messages", MessageController, :create
  end

  scope "/", KafkaConsumerWeb do
    pipe_through :browser

    get "/", PageController, :home
  end

  # Handle 404 errors
  get "/*path", KafkaConsumerWeb.ErrorController, :not_found

  # Handle 500 errors
  forward "/500", KafkaConsumerWeb.ErrorController, :internal_server_error
end
