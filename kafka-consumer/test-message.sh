#!/bin/bash

# Mesaj de test în format JSON
TEST_MESSAGE='{"type": "reservation.created", "data": {"id": 1, "status": "pending", "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"}}'

# Trimite mesajul la topic-ul reservations
echo $TEST_MESSAGE | docker exec -i simplu-api-kafka-1 kafka-console-producer --broker-list localhost:9092 --topic reservations 