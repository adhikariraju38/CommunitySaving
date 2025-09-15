#!/bin/bash

# Community Savings App Setup Script
echo "🚀 Setting up Community Savings & Loan Management System..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ and try again."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm and try again."
    exit 1
fi

echo "✅ Node.js and npm are installed"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "📝 Creating environment configuration..."
    cat > .env.local << EOF
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/community-savings
# For MongoDB Atlas, replace with your connection string:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/community-savings

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=$(openssl rand -base64 32)

# JWT Secret
JWT_SECRET=$(openssl rand -base64 32)

# Email Configuration (Optional for password reset)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EOF
    echo "✅ Created .env.local with random secrets"
else
    echo "✅ .env.local already exists"
fi

# Check if MongoDB is running (local installation)
if command -v mongod &> /dev/null; then
    if ! pgrep -x "mongod" > /dev/null; then
        echo "⚠️  MongoDB is installed but not running."
        echo "   Start MongoDB manually or use MongoDB Atlas for cloud hosting."
    else
        echo "✅ MongoDB is running locally"
    fi
else
    echo "⚠️  MongoDB not found locally. Consider using MongoDB Atlas for cloud hosting."
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update .env.local with your MongoDB connection string if needed"
echo "2. Run 'npm run dev' to start the development server"
echo "3. Open http://localhost:3000 in your browser"
echo "4. Register the first user (will become admin)"
echo ""
echo "For MongoDB Atlas setup:"
echo "1. Visit https://cloud.mongodb.com"
echo "2. Create a free M0 cluster"
echo "3. Get the connection string"
echo "4. Update MONGODB_URI in .env.local"
echo ""
echo "For deployment to Vercel:"
echo "1. Push code to GitHub"
echo "2. Connect repository to Vercel"
echo "3. Add environment variables in Vercel dashboard"
echo "4. Deploy!"
echo ""
echo "Happy coding! 💻"
