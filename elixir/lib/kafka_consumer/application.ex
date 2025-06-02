defmodule KafkaConsumer.Application do
  use Application

  @impl true
  def start(_type, _args) do
    children = [
      KafkaConsumer.ConversationsConsumer,
      KafkaConsumer.AgentPublisher
    ]

    opts = [strategy: :one_for_one, name: KafkaConsumer.Supervisor]
    Supervisor.start_link(children, opts)
  end
end
