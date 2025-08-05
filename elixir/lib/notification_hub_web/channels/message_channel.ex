defmodule NotificationHubWeb.MessageChannel do
  use Phoenix.Channel
  require Logger

  @impl true
  def join("messages:" <> tenant_id, _payload, socket) do
    Logger.info("Client joined messages channel: messages:#{tenant_id}")
    {:ok, socket}
  end

  @impl true
  def join(_topic, _payload, _socket) do
    {:error, %{reason: "unauthorized"}}
  end

  @impl true
  def handle_in("ping", payload, socket) do
    {:reply, {:ok, payload}, socket}
  end

  @impl true
  def handle_in(_event, _payload, socket) do
    {:noreply, socket}
  end
end
