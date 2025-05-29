defmodule KafkaConsumer.MixProject do
  use Mix.Project

  def project do
    [
      app: :kafka_consumer,
      version: "0.1.0",
      elixir: "~> 1.14",
      start_permanent: Mix.env() == :prod,
      deps: deps(),
      releases: [
        kafka_consumer: [
          include_erts: true,
          include_src: false
        ]
      ]
    ]
  end

  def application do
    [
      extra_applications: [:logger, :broadway],
      mod: {KafkaConsumer.Application, []}
    ]
  end

  defp deps do
    [
      {:broadway_kafka, "~> 0.3.0"},
      {:jason, "~> 1.4"}
    ]
  end
end
