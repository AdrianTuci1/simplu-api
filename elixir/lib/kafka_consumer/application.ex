defmodule KafkaConsumer.Application do
  use Application

  @impl true
  def start(_type, _args) do
    children = [
      {Phoenix.PubSub, name: KafkaConsumer.PubSub},
      KafkaConsumer.ConversationsConsumer,
      KafkaConsumer.AgentPublisher,
      KafkaConsumerWeb.Endpoint
    ]

    opts = [strategy: :one_for_one, name: KafkaConsumer.Supervisor]
    Supervisor.start_link(children, opts)
  end
end
