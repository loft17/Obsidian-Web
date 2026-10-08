#!/bin/bash
set -e

echo "🔍 Obsidian Web Diagnostic Tool"
echo "========================="
echo ""

# Check Node.js
echo "✓ Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo "  ❌ Node.js not found. Install it with: curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs"
    exit 1
fi
NODE_VERSION=$(node --version)
echo "  ✅ Node.js $NODE_VERSION"

# Check npm
echo "✓ Checking npm..."
NPM_VERSION=$(npm --version)
echo "  ✅ npm $NPM_VERSION"

# Check dependencies
echo "✓ Checking dependencies..."
if [ ! -d "node_modules" ]; then
    echo "  ⚠️  node_modules not found. Run: npm install"
fi
if npm list express cookie-parser markdown-it &> /dev/null; then
    echo "  ✅ Server dependencies installed"
else
    echo "  ❌ Server dependencies missing or broken. Run: npm install"
fi

# Check config
echo "✓ Checking configuration..."
if [ -f "data/config.json" ]; then
    echo "  ✅ config.json exists"
    VAULT_PATH=$(grep -o '"vaultPath":"[^"]*' data/config.json | cut -d'"' -f4)
    echo "    Vault path: $VAULT_PATH"
    if [ -d "$VAULT_PATH" ]; then
        echo "    ✅ Vault directory exists"
        FILE_COUNT=$(find "$VAULT_PATH" -name "*.md" 2>/dev/null | wc -l)
        echo "    Found $FILE_COUNT .md files"
    else
        echo "    ❌ Vault directory NOT found"
    fi
else
    echo "  ℹ️  No config.json (setup needed)"
fi

# Check web build
echo "✓ Checking web build..."
if [ -d "web/dist" ]; then
    echo "  ✅ web/dist exists"
else
    echo "  ⚠️  web/dist not found. Run: npm install (includes build)"
fi

# Check permissions
echo "✓ Checking permissions..."
if [ -w "." ]; then
    echo "  ✅ Writable current directory"
else
    echo "  ❌ NOT writable: check file permissions"
fi

if [ -w "data" ] 2>/dev/null; then
    echo "  ✅ Writable data/ directory"
else
    echo "  ⚠️  data/ not writable"
fi

# Port check
echo "✓ Checking port availability..."
PORT=${PORT:-3000}
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    PID=$(lsof -Pi :$PORT -sTCP:LISTEN -t)
    echo "  ❌ Port $PORT already in use (PID: $PID)"
else
    echo "  ✅ Port $PORT available"
fi

echo ""
echo "========================="
echo "✅ Diagnostic complete!"
echo ""
echo "Next steps:"
echo "  1. If all checks pass: npm start"
echo "  2. If dependencies missing: npm install"
echo "  3. If config missing: Complete setup in web UI"
