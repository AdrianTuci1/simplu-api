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
      {:broadway, "~> 1.0"},
      {:broadway_kafka, "~> 0.3"},
      {:jason, "~> 1.4"},
      {:uuid, "~> 1.1"},
      {:brod, "~> 3.16"}
    ]
  end
end
