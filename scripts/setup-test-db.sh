#!/bin/bash

# Setup script for test database
# This ensures the database has the correct schema and test data for RLS tests

echo "Setting up test database..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "Error: Docker is not running. Please start Docker first."
    exit 1
fi

# Start Supabase if not already running
echo "Starting Supabase..."
npx supabase start

# Reset database and apply migrations
echo "Resetting database and applying migrations..."
npx supabase db reset

# Apply test seed data
echo "Applying test seed data..."
npx supabase db push < supabase/seed-test.sql

echo "Test database setup complete!"
echo "You can now run tests with: npm test"