#!/bin/bash
set -e

# I am in /app
pkill -f 'node' || true
rm -rf jules-scratch
mkdir -p jules-scratch/verification

# Install server dependencies
npm install

# Install client dependencies and build
(cd client && npm install && npm run build)

# Start MongoDB
mongod --fork --logpath /var/log/mongodb.log

# Start the server
node server.js &

# Wait for the server to start
sleep 15

# Install playwright and its dependencies
python3 -m playwright install --with-deps

# Run the verification script
python3 jules-scratch/verification/verify_admin_dashboard.py