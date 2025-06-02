defmodule KafkaConsumerWeb.ReservationsChannel do
  use KafkaConsumerWeb, :channel
  require Logger

  @impl true
  def join("reservations:" <> _id, _payload, socket) do
    {:ok, socket}
  end

  @impl true
  def handle_in("new_reservation", payload, socket) do
    Logger.info("Received new reservation: #{inspect(payload)}")
    broadcast!(socket, "new_reservation", payload)
    {:reply, {:ok, payload}, socket}
  end
end
