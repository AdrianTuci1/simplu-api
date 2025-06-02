defmodule AgentConsumer do
  use KafkaEx.GenConsumer
  require Logger

  # Event types matching the TypeScript enum
  @event_types %{
    agent_response: "agent.response",
    agent_decision: "agent.decision",
    agent_suggestion: "agent.suggestion",
    agent_consultation: "agent.consultation"
  }

  # Decision levels matching the TypeScript enum
  @decision_levels %{
    automatic: "automatic",
    suggestion: "suggestion",
    consultation: "consultation"
  }

  @impl true
  def handle_message_set(message_set, state) do
    for message <- message_set do
      case Jason.decode(message.value) do
        {:ok, event} ->
          handle_event(event)
        {:error, error} ->
          Logger.error("Failed to decode message: #{inspect(error)}")
      end
    end
    {:ok, state}
  end

  # Handle different event types
  defp handle_event(%{
    "type" => @event_types.agent_response,
    "payload" => payload,
    "tenantId" => tenant_id,
    "messageId" => message_id,
    "timestamp" => timestamp
  }) do
    Logger.info("Processing agent response for tenant #{tenant_id}")
    # Handle normal responses
    process_response(tenant_id, payload)
  end

  defp handle_event(%{
    "type" => @event_types.agent_suggestion,
    "payload" => payload,
    "tenantId" => tenant_id,
    "messageId" => message_id,
    "timestamp" => timestamp
  }) do
    Logger.info("Processing agent suggestion for tenant #{tenant_id}")
    # Handle suggestions that need approval
    process_suggestion(tenant_id, payload)
  end

  defp handle_event(%{
    "type" => @event_types.agent_consultation,
    "payload" => payload,
    "tenantId" => tenant_id,
    "messageId" => message_id,
    "timestamp" => timestamp
  }) do
    Logger.info("Processing agent consultation for tenant #{tenant_id}")
    # Handle consultations that need human input
    process_consultation(tenant_id, payload)
  end

  defp handle_event(%{
    "type" => @event_types.agent_decision,
    "payload" => payload,
    "tenantId" => tenant_id,
    "messageId" => message_id,
    "timestamp" => timestamp
  }) do
    Logger.info("Processing agent decision for tenant #{tenant_id}")
    # Handle decisions
    process_decision(tenant_id, payload)
  end

  defp handle_event(event) do
    Logger.warn("Unknown event type: #{inspect(event)}")
  end

  # Process different types of events
  defp process_response(tenant_id, %{
    "content" => content,
    "role" => role,
    "context" => context,
    "metadata" => metadata
  }) do
    # Implement your response handling logic here
    # For example, store in database, notify users, etc.
    {:ok, "Response processed"}
  end

  defp process_suggestion(tenant_id, %{
    "content" => content,
    "role" => role,
    "context" => context,
    "metadata" => %{"requiresApproval" => true} = metadata
  }) do
    # Implement suggestion handling logic
    # For example, create approval request, notify approvers, etc.
    {:ok, "Suggestion processed"}
  end

  defp process_consultation(tenant_id, %{
    "content" => content,
    "role" => role,
    "context" => context,
    "metadata" => metadata
  }) do
    # Implement consultation handling logic
    # For example, create human intervention request, notify operators, etc.
    {:ok, "Consultation processed"}
  end

  defp process_decision(tenant_id, %{
    "content" => content,
    "role" => role,
    "context" => context,
    "metadata" => metadata
  }) do
    # Implement decision handling logic
    # For example, execute business logic, update state, etc.
    {:ok, "Decision processed"}
  end

  # Helper functions for common operations
  defp store_event(tenant_id, event_type, payload) do
    # Implement event storage logic
    # For example, store in database for audit trail
    {:ok, "Event stored"}
  end

  defp notify_operators(tenant_id, message) do
    # Implement operator notification logic
    # For example, send to notification service
    {:ok, "Operators notified"}
  end

  defp create_approval_request(tenant_id, suggestion) do
    # Implement approval request creation logic
    # For example, create approval record in database
    {:ok, "Approval request created"}
  end
end
