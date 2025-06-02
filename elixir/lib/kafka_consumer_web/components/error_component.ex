defmodule KafkaConsumerWeb.ErrorComponent do
  use KafkaConsumerWeb, :html

  def render("404.html", assigns) do
    ~H"""
    <div class="error-container">
      <h1>404 - Not Found</h1>
      <p>The page you are looking for does not exist.</p>
    </div>
    """
  end

  def render("500.html", assigns) do
    ~H"""
    <div class="error-container">
      <h1>500 - Internal Server Error</h1>
      <p>Something went wrong on our end.</p>
    </div>
    """
  end

  def render("404.json", _assigns) do
    %{errors: %{detail: "Not Found"}}
  end

  def render("500.json", _assigns) do
    %{errors: %{detail: "Internal Server Error"}}
  end
end
