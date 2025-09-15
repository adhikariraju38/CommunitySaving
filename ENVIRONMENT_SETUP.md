# Environment Variables Setup

Create a `.env.local` file in the root directory with the following variables:

```bash
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/community-savings
# For MongoDB Atlas use:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/community-savings

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-super-secret-key-change-this-in-production

# JWT Secret
JWT_SECRET=your-jwt-secret-key-change-this-in-production

# Email Configuration (Optional for password reset)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

## Quick Setup Commands

```bash
# Copy this to create your environment file:
cp ENVIRONMENT_SETUP.md .env.local

# Then edit .env.local with your actual values
```
