# Takealot Delivery Management System

A comprehensive delivery management platform for Takealot drivers with trip tracking, COD payment verification, real-time notifications, and admin oversight.

## 🚀 Features

### For Drivers
- **Trip Management**: Record trips, edit pickup/delivery times, track delivery status
- **COD Payment Tracking**: Collect cash, deposit at ATM with automated verification
- **Real-time Notifications**: Get instant updates on trip assignments and payments
- **Earnings Dashboard**: View earnings breakdown, delivery history, performance metrics
- **Proof of Delivery**: Capture signatures, photos, and GPS location
- **Route Optimization**: Get optimized routes with traffic-aware navigation

### For Admins
- **Driver Management**: Monitor all drivers, track performance, manage assignments
- **Trip Oversight**: Create, assign, and monitor all deliveries
- **Payment Verification**: Verify COD deposits, process driver payments
- **Broadcast Messaging**: Send announcements to all drivers or specific groups
- **Analytics & Reports**: View comprehensive analytics and generate reports

## 🛠️ Technology Stack

### Frontend
- React 18 with TypeScript
- Vite for fast development
- Tailwind CSS for styling
- React Router for navigation
- React Query for server state management
- Zustand for client state management
- Socket.io for real-time updates

### Backend
- Node.js with Express.js
- TypeScript
- PostgreSQL database
- Prisma ORM
- JWT authentication
- Socket.io for real-time features
- Bull for background jobs
- Redis for caching

### External Services
- Google Maps API for routing
- Banking API for ATM verification
- Twilio for SMS notifications
- SendGrid for emails
- Firebase Cloud Messaging for push notifications
- Cloudinary for image storage

## 📁 Project Structure

```
takealot-delivery-system/
├── backend/              # Backend API
│   ├── prisma/          # Database schema & migrations
│   ├── src/
│   │   ├── routes/      # API routes
│   │   ├── controllers/ # Route controllers
│   │   ├── services/    # Business logic
│   │   ├── middleware/  # Express middleware
│   │   ├── lib/         # Utilities & helpers
│   │   └── index.ts     # Server entry point
│   └── package.json
├── frontend/            # React frontend
│   ├── src/
│   │   ├── pages/       # Page components
│   │   ├── components/  # Reusable components
│   │   ├── hooks/       # Custom hooks
│   │   ├── lib/         # Utilities
│   │   ├── types/       # TypeScript types
│   │   └── main.tsx     # App entry point
│   └── package.json
├── ARCHITECTURE.md      # System architecture documentation
├── DATABASE_SCHEMA.sql  # Database schema
└── package.json         # Root package.json (workspaces)
```

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL 15+
- Redis
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/snerantie/Takealot-Delivery-system.git
cd Takealot-Delivery-system
```

2. **Install dependencies**
```bash
npm run install:all
```

3. **Set up environment variables**

Backend:
```bash
cd backend
cp .env.example .env
# Edit .env with your configuration
```

Frontend:
```bash
cd frontend
cp .env.example .env
# Edit .env with your configuration
```

4. **Set up the database**
```bash
cd backend
npm run prisma:migrate
npm run prisma:seed
```

5. **Start development servers**

From the root directory:
```bash
npm run dev
```

Or separately:
```bash
# Terminal 1 - Backend
npm run dev:backend

# Terminal 2 - Frontend
npm run dev:frontend
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## 📚 API Documentation

API documentation is available at `/api/docs` when running the development server.

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## 🚀 Deployment

### Backend Deployment
```bash
cd backend
npm run build
npm start
```

### Frontend Deployment
```bash
cd frontend
npm run build
# Deploy the dist/ folder to your hosting provider
```

## 📝 Environment Variables

### Backend
See `backend/.env.example` for all required environment variables.

### Frontend
See `frontend/.env.example` for all required environment variables.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 👥 Authors

- Your Name - Initial work

## 🙏 Acknowledgments

- Takealot delivery drivers for the inspiration
- All contributors and testers
