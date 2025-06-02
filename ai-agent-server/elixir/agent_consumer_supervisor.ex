defmodule AgentConsumerSupervisor do
  use Supervisor
  require Logger

  def start_link(init_arg) do
    Supervisor.start_link(__MODULE__, init_arg, name: __MODULE__)
  end

  @impl true
  def init(_init_arg) do
    group_id = System.get_env("KAFKA_GROUP_ID", "agent-consumer-group")
    Logger.info("Starting consumer with group ID: #{group_id}")

    children = [
      %{
        id: AgentConsumer,
        start: {
          KafkaEx.ConsumerGroup,
          :start_link,
          [
            AgentConsumer,
            group_id,
            ["agent.events"],
            [
              uris: [
                %{
                  host: System.get_env("KAFKA_HOST", "localhost"),
                  port: String.to_integer(System.get_env("KAFKA_PORT", "9092"))
                }
              ],
              consumer_group: group_id,
              consumer_group_update_interval: 1000,
              max_bytes_per_partition: 1_000_000,
              max_wait_time: 10_000,
              min_bytes: 1,
              offset_commit_interval: 5_000,
              offset_commit_threshold: 100,
              rebalance_delay_max: 2_000,
              rebalance_delay_ms: 500,
              session_timeout: 30_000,
              start_with_earliest_message: true
            ]
          ]
        }
      }
    ]

    Supervisor.init(children, strategy: :one_for_one)
  end
end
