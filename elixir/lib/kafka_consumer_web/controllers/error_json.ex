defmodule KafkaConsumerWeb.ErrorJSON do
  def render("500.json", _assigns) do
    %{errors: %{detail: "Internal server error"}}
  end

  def render("404.json", _assigns) do
    %{errors: %{detail: "Not found"}}
  end

  def render("400.json", _assigns) do
    %{errors: %{detail: "Bad request"}}
  end

  def render("401.json", _assigns) do
    %{errors: %{detail: "Unauthorized"}}
  end

  def render("403.json", _assigns) do
    %{errors: %{detail: "Forbidden"}}
  end

  # In case no render clause matches or no
  # template is found, let's render a 500 error
  def template_not_found(_template, assigns) do
    render("500.json", assigns)
  end
end
