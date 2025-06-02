defmodule KafkaConsumerWeb.MessageChannel do
  use KafkaConsumerWeb, :channel
  require Logger

  @impl true
  def join("messages:" <> _id, _payload, socket) do
    {:ok, socket}
  end

  @impl true
  def handle_in("new_message", payload, socket) do
    Logger.info("Received new message: #{inspect(payload)}")
    broadcast!(socket, "new_message", payload)
    {:reply, {:ok, payload}, socket}
  end

  @impl true
  def handle_in("typing", payload, socket) do
    broadcast!(socket, "typing", payload)
    {:noreply, socket}
  end

  def handle_info({:message_received, message}, socket) do
    push(socket, "new_message", message)
    {:noreply, socket}
  end
end
