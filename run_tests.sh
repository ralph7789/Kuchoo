#!/bin/bash
set -e

# Kill any existing node processes
pkill -f 'node' || true
pkill -f 'mongod' || true

# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# Install dependencies for the server
npm install

# Install client dependencies and build
cd client
npm install
npm run build
cd ..

# Start MongoDB
mongod --fork --logpath /var/log/mongodb.log

# Start the server
node server.js &
sleep 20

# Create the verification script
mkdir -p /app/jules-scratch/verification
cat > /app/jules-scratch/verification/verify_admin_dashboard.py <<'EOF'
from playwright.sync_api import sync_playwright, expect
import time

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        page.goto('http://localhost:5000/admin', wait_until='networkidle')
        expect(page.locator('.MuiDataGrid-root')).to_be_visible()
        expect(page.get_by_role('heading', name='Users')).to_be_visible()
        page.screenshot(path='/app/jules-scratch/verification/admin_dashboard.png')
    except Exception as e:
        print(f'An error occurred: {e}')
        page.screenshot(path='/app/jules-scratch/verification/error.png')
        raise
    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
EOF

# Install playwright and its dependencies
python3 -m playwright install --with-deps

# Run the verification script
python3 /app/jules-scratch/verification/verify_admin_dashboard.py