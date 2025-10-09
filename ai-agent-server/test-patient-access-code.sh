#!/bin/bash

# Test script for Patient Access Code System
# This script tests the booking confirmation with patient access code generation

echo "═══════════════════════════════════════════════════════════"
echo "  Testing Patient Access Code System"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Configuration
BASE_URL="http://localhost:3003"
BUSINESS_ID="bus-123"
LOCATION_ID="loc-001"

# Test data
PATIENT_DATA='{
  "patientName": "Ion Popescu",
  "patientEmail": "ion.popescu@example.com",
  "patientPhone": "+40721234567",
  "patientId": "patient00123",
  "appointmentId": "apt-456",
  "domainLabel": "clinica-test",
  "appointmentDate": "15 ianuarie 2024",
  "appointmentTime": "14:30",
  "serviceName": "Consult stomatologic",
  "doctorName": "Dr. Maria Popescu"
}'

echo "📋 Test Configuration:"
echo "   Business ID: $BUSINESS_ID"
echo "   Location ID: $LOCATION_ID"
echo "   Patient ID: patient00123"
echo "   Appointment ID: apt-456"
echo ""

echo "📤 Sending booking confirmation request..."
echo ""

# Send request
RESPONSE=$(curl -s -X POST \
  "${BASE_URL}/message-automation/${BUSINESS_ID}/send-booking-confirmation?locationId=${LOCATION_ID}" \
  -H "Content-Type: application/json" \
  -d "$PATIENT_DATA")

echo "📥 Response:"
echo "$RESPONSE" | jq '.'
echo ""

# Check if successful
SMS_SUCCESS=$(echo "$RESPONSE" | jq -r '.[0].success // false')
EMAIL_SUCCESS=$(echo "$RESPONSE" | jq -r '.[1].success // false')

echo "═══════════════════════════════════════════════════════════"
echo "  Results Summary"
echo "═══════════════════════════════════════════════════════════"
echo ""

if [ "$SMS_SUCCESS" = "true" ]; then
  echo "✅ SMS sent successfully"
  SMS_MESSAGE_ID=$(echo "$RESPONSE" | jq -r '.[0].messageId')
  echo "   Message ID: $SMS_MESSAGE_ID"
else
  echo "❌ SMS failed"
  SMS_ERROR=$(echo "$RESPONSE" | jq -r '.[0].error')
  echo "   Error: $SMS_ERROR"
fi

echo ""

if [ "$EMAIL_SUCCESS" = "true" ]; then
  echo "✅ Email sent successfully"
  EMAIL_MESSAGE_ID=$(echo "$RESPONSE" | jq -r '.[1].messageId')
  echo "   Message ID: $EMAIL_MESSAGE_ID"
else
  echo "❌ Email failed"
  EMAIL_ERROR=$(echo "$RESPONSE" | jq -r '.[1].error')
  echo "   Error: $EMAIL_ERROR"
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "📝 Expected in messages:"
echo "   • Access Code: 6-digit number (generated from patient00123 + apt-456)"
echo "   • Patient URL: https://clinica-test.simplu.io/[location]/details?patientpatient00123"
echo "   • Location Name instead of Business Name"
echo ""
echo "💡 Check server logs for:"
echo "   • accessCode: \"XXXXXX\""
echo "   • patientUrl: \"https://...\""
echo ""
echo "═══════════════════════════════════════════════════════════"

