defmodule KafkaProducer do
  def send_test_messages do
    # Configure Kafka producer
    :brod.start_client([localhost: 9092], :kafka_client)
    :brod.start_producer(:kafka_client, "conversations", [])
    :brod.start_producer(:kafka_client, "reservations", [])

    # Send test conversation message
    conversation = %{
      "conversationId" => "test-conv-1",
      "messageId" => "msg-1",
      "userId" => "user-1",
      "content" => "Hello, this is a test conversation!"
    }
    :brod.produce_sync(:kafka_client, "conversations", 0, "key1", Jason.encode!(conversation))

    # Send test reservation message
    reservation = %{
      "reservationId" => "res-1",
      "userId" => "user-1",
      "status" => "pending"
    }
    :brod.produce_sync(:kafka_client, "reservations", 0, "key2", Jason.encode!(reservation))

    IO.puts("Test messages sent!")
  end
end

# Run the test
KafkaProducer.send_test_messages()
