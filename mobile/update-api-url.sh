#!/bin/bash

# Get the local IPv4 address (en0 is typically WiFi on Mac)
IP=$(ipconfig getifaddr en0)

# If en0 doesn't have an IP, try en1 (sometimes Ethernet)
if [ -z "$IP" ]; then
    IP=$(ipconfig getifaddr en1)
fi

# If still no IP found, exit with error
if [ -z "$IP" ]; then
    echo "Error: Could not detect IPv4 address"
    exit 1
fi

ENV_FILE="$(dirname "$0")/.env"

# Check if .env file exists
if [ ! -f "$ENV_FILE" ]; then
    echo "Error: .env file not found at $ENV_FILE"
    exit 1
fi

# Update or add EXPO_PUBLIC_API_URL
if grep -q "^EXPO_PUBLIC_API_URL=" "$ENV_FILE"; then
    # Replace existing line
    sed -i '' "s|^EXPO_PUBLIC_API_URL=.*|EXPO_PUBLIC_API_URL=http://$IP:5001|" "$ENV_FILE"
else
    # Add new line
    echo "EXPO_PUBLIC_API_URL=http://$IP:5001" >> "$ENV_FILE"
fi

echo "Updated EXPO_PUBLIC_API_URL to http://$IP:5001"
