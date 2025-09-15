# Community Savings & Loan Management System

A full-stack Next.js application for managing community savings groups with loan functionality.

## 🚀 Features

### 🔐 Authentication & User Management

- Email/password login with JWT tokens
- Role-based access control (Admin/Member)
- User registration with automatic member ID generation
- Secure session management

### 👥 User Roles

#### Admin Features

- **Dashboard Overview**: Total savings, loans, interest collected, member statistics
- **User Management**: Create, edit, activate/deactivate members
- **Loan Approval**: Review and approve/reject loan applications
- **Payment Recording**: Record member contributions and loan repayments
- **Reporting**: Export data in various formats

#### Member Features

- **Personal Dashboard**: Savings balance, contribution history, loan status
- **Loan Requests**: Apply for loans with collateral and guarantor information
- **Savings Tracking**: View monthly contributions and payment history
- **Loan History**: Track current and past loan applications

### 💰 Financial Management

- **Monthly Contributions**: Fixed $2000 monthly contributions per member
- **Loan System**: 16% interest rate with flexible repayment terms
- **Payment Tracking**: Comprehensive recording of all transactions
- **Interest Calculations**: Automatic calculation of loan interest and repayments

## 🛠️ Tech Stack

### Backend

- **Next.js 14** with App Router
- **TypeScript** for type safety
- **MongoDB** with Mongoose ODM
- **JWT** for authentication
- **bcryptjs** for password hashing

### Frontend

- **React 18** with TypeScript
- **TailwindCSS** for styling
- **Radix UI** components
- **Lucide React** icons
- **Recharts** for data visualization

### Database Models

- **User**: Member profiles, roles, authentication
- **Contribution**: Monthly savings tracking
- **Loan**: Loan applications and management
- **Repayment**: Loan payment history

## 📦 Installation

1. **Clone the repository**

```bash
git clone <repository-url>
cd community-savings-app
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up environment variables**

```bash
cp ENVIRONMENT_SETUP.md .env.local
# Edit .env.local with your actual values
```

Required environment variables:

```env
MONGODB_URI=mongodb://localhost:27017/community-savings
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-super-secret-key
JWT_SECRET=your-jwt-secret-key
```

4. **Start the development server**

```bash
npm run dev
```

5. **Open the application**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🗄️ Database Setup

### Local MongoDB

1. Install MongoDB locally
2. Start MongoDB service
3. The application will automatically create collections

### MongoDB Atlas (Cloud)

1. Create a MongoDB Atlas account
2. Create a new cluster (M0 free tier available)
3. Get connection string
4. Update `MONGODB_URI` in `.env.local`

## 📱 Usage

### First Time Setup

1. Register as the first user (will be admin by default)
2. Create additional members through admin dashboard
3. Set up monthly contributions for all members
4. Configure loan parameters as needed

### Daily Operations

- **Members**: Log in to view savings, request loans, check history
- **Admins**: Approve loans, record payments, manage members

## 🚀 Deployment

### Vercel (Recommended)

1. **Push to GitHub**

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin <your-github-repo>
git push -u origin main
```

2. **Deploy to Vercel**

- Connect your GitHub repository to Vercel
- Add environment variables in Vercel dashboard
- Deploy automatically on push

3. **Configure MongoDB Atlas**

- Use MongoDB Atlas for production database
- Update connection string in Vercel environment variables

### Environment Variables for Production

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/community-savings
NEXTAUTH_URL=https://your-domain.vercel.app
NEXTAUTH_SECRET=your-production-secret
JWT_SECRET=your-production-jwt-secret
```

## 📊 API Endpoints

### Authentication

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Users

- `GET /api/users` - Get all users (Admin)
- `POST /api/users` - Create user (Admin)
- `GET /api/users/[id]` - Get user by ID
- `PUT /api/users/[id]` - Update user (Admin)
- `DELETE /api/users/[id]` - Delete user (Admin)

### Loans

- `GET /api/loans` - Get loans (filtered by role)
- `POST /api/loans` - Create loan request
- `GET /api/loans/[id]` - Get loan details
- `PUT /api/loans/[id]` - Update loan (Admin)
- `POST /api/loans/[id]/repayments` - Record repayment (Admin)

### Contributions

- `GET /api/contributions` - Get contributions
- `POST /api/contributions` - Create/record contributions (Admin)

### Dashboard

- `GET /api/dashboard` - Get dashboard statistics

## 🔧 Development

### Code Structure

```
src/
├── app/                 # Next.js App Router pages
├── components/          # React components
│   ├── ui/             # Reusable UI components
│   ├── admin/          # Admin-specific components
│   └── member/         # Member-specific components
├── lib/                # Utility functions
├── middleware/         # Authentication middleware
├── models/             # MongoDB/Mongoose models
└── types/              # TypeScript type definitions
```

### Key Features

- **Type Safety**: Full TypeScript coverage
- **Authentication**: JWT-based with middleware protection
- **Responsive Design**: Mobile-first TailwindCSS styling
- **Error Handling**: Comprehensive error handling and validation
- **Security**: Input validation, rate limiting, secure password hashing

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:

1. Check the GitHub Issues
2. Review the environment setup guide
3. Ensure all dependencies are correctly installed
4. Verify MongoDB connection

## 🎯 Future Enhancements

- Email notifications for loan approvals/due dates
- Advanced reporting and analytics
- Mobile app with React Native
- SMS integration for payment reminders
- Multi-currency support
- Backup and restore functionality
- Advanced user permissions system

---

Built with ❤️ using Next.js, TypeScript, and MongoDB
