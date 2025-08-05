defmodule NotificationHubWeb.CoreComponents do
  @moduledoc """
  Provides core UI components.
  """
  use Phoenix.Component

  @doc """
  Renders a simple div.
  """
  def simple_div(assigns) do
    ~H"""
    <div><%= render_slot(@inner_block) %></div>
    """
  end
end
