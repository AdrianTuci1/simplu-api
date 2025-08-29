defmodule NotificationHubWeb.ResourcesChannel do
  use Phoenix.Channel
  require Logger

  @impl true
  def join("resources:" <> business_location, _payload, socket) do
    Logger.info("Client joined resources channel: resources:#{business_location}")
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
  def handle_info(%Phoenix.Socket.Broadcast{event: "resource_update", payload: payload}, socket) do
    Logger.info("Received broadcast resource_update, forwarding to client: #{inspect(payload)}")
    # Forward the resource update to the connected client
    push(socket, "resource_update", payload)
    {:noreply, socket}
  end

  @impl true
  def handle_in(_event, _payload, socket) do
    {:noreply, socket}
  end
end
