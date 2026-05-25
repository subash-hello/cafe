#!/bin/bash
# The Cupping Room - Automatic Setup Script
# Run this script to set up the entire backend automatically

echo "╔════════════════════════════════════════════════╗"
echo "║   🚀 The Cupping Room - Backend Setup         ║"
echo "╚════════════════════════════════════════════════╝"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed!"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js found: $(node --version)"
echo ""

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed!"
    exit 1
fi

echo "✅ npm found: $(npm --version)"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed successfully!"
echo ""

# Copy .env file
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "✅ .env file created (update with your settings)"
else
    echo "✅ .env file already exists"
fi

echo ""
echo "╔════════════════════════════════════════════════╗"
echo "║   ✅ Setup Complete!                          ║"
echo "╚════════════════════════════════════════════════╝"
echo ""
echo "📝 Next Steps:"
echo "1. Edit .env file with your MongoDB URI"
echo "2. Run: npm run dev"
echo "3. Open: http://localhost:5000/index.html"
echo "4. Admin: http://localhost:5000/admin.html"
echo ""
echo "🔐 Register admin:"
echo "curl -X POST http://localhost:5000/api/admin/register \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"username\":\"admin\",\"password\":\"admin123\",\"email\":\"admin@example.com\"}'"
echo ""
