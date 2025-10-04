#!/bin/bash

# AWS SES Setup Script pentru Simplu
echo "🚀 AWS SES Setup pentru Simplu"
echo "================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js nu este instalat. Te rugăm să instalezi Node.js mai întâi."
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Te rugăm să rulezi scriptul din directorul rădăcină al proiectului."
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Instalare dependențe..."
    npm install
fi

# Check if AWS SDK is available
if ! npm list @aws-sdk/client-ses &> /dev/null; then
    echo "📦 Instalare AWS SDK pentru SES..."
    npm install @aws-sdk/client-ses
fi

echo "✅ Pregătire completă. Lansare setup SES..."
echo ""

# Run the SES setup script
node scripts/setup-ses.js "$@"
