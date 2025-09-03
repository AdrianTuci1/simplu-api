#!/bin/bash

echo "=== Enhanced Logging and LLM Processing Test ==="
echo "This script will test the enhanced logging and intent detection"
echo ""

# Test different types of messages to verify intent detection
echo "1. Testing greeting message..."
curl -X POST http://localhost:4000/api/messages \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "B0100001",
    "user_id": "test-user-001", 
    "session_id": "test-session-001",
    "content": "Salut! Bună ziua!"
  }'

echo ""
echo ""

echo "2. Testing help request..."
curl -X POST http://localhost:4000/api/messages \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "B0100001",
    "user_id": "test-user-002", 
    "session_id": "test-session-002",
    "content": "Ma poti ajuta cu rezervarile?"
  }'

echo ""
echo ""

echo "3. Testing booking request..."
curl -X POST http://localhost:4000/api/messages \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "B0100001",
    "user_id": "test-user-003", 
    "session_id": "test-session-003",
    "content": "Vreau sa fac o rezervare pentru maine"
  }'

echo ""
echo ""

echo "4. Testing information request..."
curl -X POST http://localhost:4000/api/messages \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "B0100001",
    "user_id": "test-user-004", 
    "session_id": "test-session-004",
    "content": "Ce informatii aveti despre serviciile voastre?"
  }'

echo ""
echo ""

echo "5. Testing problem report..."
curl -X POST http://localhost:4000/api/messages \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "B0100001",
    "user_id": "test-user-005", 
    "session_id": "test-session-005",
    "content": "Am o problema cu rezervarea mea"
  }'

echo ""
echo ""

echo "6. Testing gratitude message..."
curl -X POST http://localhost:4000/api/messages \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "B0100001",
    "user_id": "test-user-006", 
    "session_id": "test-session-006",
    "content": "Multumesc pentru ajutor!"
  }'

echo ""
echo ""

echo "=== Test completed ==="
echo "Check the AI Agent Server logs to see:"
echo "- Enhanced message processing logs"
echo "- Intent detection results"
echo "- Entity extraction"
echo "- Suggested actions"
echo "- LLM processing details"
echo "- HTTP communication logs"
echo ""
echo "Look for the following log sections:"
echo "- === Processing Message from Notification Hub ==="
echo "- === LLM Processing Started ==="
echo "- === AI Processing Results ==="
echo "- === Sending AI Response to Notification Hub ==="
