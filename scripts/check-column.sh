#!/bin/bash

# Check if extraction_mode column exists
echo "Checking if extraction_mode column exists in transaction_files table..."

# Query the table to check for the column
response=$(curl -s -X GET \
  'https://zygaagumqbloombllcdk.supabase.co/rest/v1/transaction_files?select=id&limit=1' \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5Z2FhZ3VtcWJsb29tYmxsY2RrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDc2ODk2OSwiZXhwIjoyMDcwMzQ0OTY5fQ.nmHvcXCsg-W3c0E9kf4dWd4ZvY_jYOXD-tdjJUB6e9M" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5Z2FhZ3VtcWJsb29tYmxsY2RrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDc2ODk2OSwiZXhwIjoyMDcwMzQ0OTY5fQ.nmHvcXCsg-W3c0E9kf4dWd4ZvY_jYOXD-tdjJUB6e9M")

echo "Response: $response"

# Now try with extraction_mode column
echo -e "\nChecking extraction_mode column specifically..."

response2=$(curl -s -X GET \
  'https://zygaagumqbloombllcdk.supabase.co/rest/v1/transaction_files?select=id,extraction_mode&limit=1' \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5Z2FhZ3VtcWJsb29tYmxsY2RrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDc2ODk2OSwiZXhwIjoyMDcwMzQ0OTY5fQ.nmHvcXCsg-W3c0E9kf4dWd4ZvY_jYOXD-tdjJUB6e9M" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5Z2FhZ3VtcWJsb29tYmxsY2RrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDc2ODk2OSwiZXhwIjoyMDcwMzQ0OTY5fQ.nmHvcXCsg-W3c0E9kf4dWd4ZvY_jYOXD-tdjJUB6e9M")

if echo "$response2" | grep -q "column transaction_files.extraction_mode does not exist"; then
  echo "❌ Column extraction_mode does NOT exist"
  echo ""
  echo "==================================================================="
  echo "MIGRATION NEEDED"
  echo "==================================================================="
  echo ""
  echo "Please apply the migration manually:"
  echo ""
  echo "1. Go to: https://supabase.com/dashboard/project/zygaagumqbloombllcdk/sql/new"
  echo ""
  echo "2. Paste and run this SQL:"
  echo ""
  cat /Users/Tom/Developer/GitHub/comply-ai/supabase/migrations/0004_transaction_files_extraction_mode.sql
  echo ""
  echo "==================================================================="
else
  echo "Response: $response2"
  if echo "$response2" | grep -q "extraction_mode"; then
    echo "✅ Column extraction_mode EXISTS"
  else
    echo "⚠️  Unable to determine column status"
  fi
fi