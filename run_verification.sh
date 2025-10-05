#!/bin/bash
set -e

# Kill any existing node processes
pkill -f 'node' || true
pkill -f 'mongod' || true

# Install server dependencies
npm install

# Install client dependencies and build
(cd client && npm install && npm run build)

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
        # Generate a unique email for registration
        unique_email = f"admin_{int(time.time())}@example.com"

        # Go to login page
        page.goto("http://localhost:5000/")

        # Go to sign up page
        page.get_by_role("button", name="Sign Up").click()

        # Fill registration form for admin user
        page.get_by_placeholder("Display Name").fill("Test Admin")
        page.get_by_placeholder("Email").fill(unique_email)
        page.get_by_placeholder("Password").fill("password123")
        page.get_by_role("button", name="Register").click()

        # Now on login page, fill login form
        expect(page.get_by_role("heading", name="Login")).to_be_visible(timeout=20000)
        page.get_by_placeholder("Email").fill(unique_email)
        page.get_by_placeholder("Password").fill("password123")
        page.get_by_role("button", name="Login").click()

        # Now logged in, on profile selection page.
        expect(page.get_by_label("Chat with:")).to_be_visible()

        # Navigate to admin dashboard
        page.goto("http://localhost:5000/admin")

        # Wait for the data grid to be visible
        expect(page.locator(".MuiDataGrid-root")).to_be_visible()
        expect(page.get_by_role("heading", name="Users")).to_be_visible()

        # Add a new user to populate the grid
        page.get_by_placeholder("Email").fill("testuser@example.com")
        page.get_by_placeholder("Password").fill("password123")
        page.get_by_placeholder("Display Name").fill("Test User")
        page.get_by_role("button", name="Add User").click()

        # Wait for the new user to appear in the grid
        expect(page.get_by_text("Test User", timeout=5000)).to_be_visible()

        # Take a screenshot
        page.screenshot(path="/app/jules-scratch/verification/admin_dashboard.png")

    except Exception as e:
        print(f'An error occurred: {e}')
        # Take a screenshot on error to help debug
        page.screenshot(path="/app/jules-scratch/verification/error.png")
        # Re-raise the exception to fail the script
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