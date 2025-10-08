#!/bin/bash

# Configure timeout and memory for copy-business-files Lambda function
# Usage: ./scripts/configure-copy-business-files-lambda.sh [FUNCTION_NAME]

FUNCTION_NAME=${1:-"copy-business-files"}
TIMEOUT=${2:-"300"}  # 5 minutes
MEMORY=${3:-"512"}   # 512 MB

echo "🔧 Configuring copy-business-files Lambda function: $FUNCTION_NAME"
echo "⏱️  Timeout: ${TIMEOUT}s (${TIMEOUT} seconds)"
echo "🧠 Memory: ${MEMORY}MB"

# Update Lambda function configuration
echo "📋 Updating Lambda function configuration..."

aws lambda update-function-configuration \
  --function-name "$FUNCTION_NAME" \
  --timeout "$TIMEOUT" \
  --memory-size "$MEMORY" \
  --description "Lambda function for copying business form files between S3 buckets. Configured for longer timeout to handle large file transfers." \
  2>/dev/null && echo "✅ Lambda configuration updated successfully" || {
    echo "❌ Failed to update Lambda configuration. Function might not exist yet."
    echo "💡 Make sure to deploy the Lambda function first using:"
    echo "   npm run deploy:lambdas"
    exit 1
  }

echo ""
echo "🎉 Lambda configuration completed!"
echo "📝 Function: $FUNCTION_NAME"
echo "⏱️  Timeout: ${TIMEOUT}s"
echo "🧠 Memory: ${MEMORY}MB"
echo ""
echo "💡 Why these settings?"
echo "  - Timeout: ${TIMEOUT}s allows copying many files or large files"
echo "  - Memory: ${MEMORY}MB provides sufficient memory for parallel file operations"
echo ""
echo "🔍 To verify the configuration:"
echo "   aws lambda get-function-configuration --function-name $FUNCTION_NAME"
