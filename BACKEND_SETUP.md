# The Cupping Room - Backend Setup Guide

## 📋 Overview

This backend system allows The Cupping Room to:
- ✅ Accept table reservations from customers
- ✅ Manage inquiry/contact form submissions
- ✅ Register customers for coffee workshops
- ✅ Admin dashboard to view & manage all bookings
- ✅ Admin authentication with JWT tokens
- ✅ User data storage in MongoDB

---

## 🚀 Quick Start

### Prerequisites
- Node.js (v14+)
- MongoDB (local or cloud)
- npm or yarn

### 1. Installation

```bash
cd cupping-room

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
nano .env
```

### 2. Configure MongoDB

**Option A: Local MongoDB**
```bash
# On macOS with Homebrew
brew services start mongodb-community

# Default connection string:
# MONGODB_URI=mongodb://localhost:27017/cupping-room
```

**Option B: MongoDB Atlas (Cloud)**
1. Go to https://www.mongodb.com/cloud/atlas
2. Create a free cluster
3. Get your connection string
4. Update `.env`:
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/cupping-room
```

### 3. Start the Server

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

You should see:
```
╔════════════════════════════════════╗
║   🚀 Cupping Room Backend Server   ║
║   Running on port 5000               ║
╚════════════════════════════════════╝
```

### 4. Create Admin Account

Run this curl command to register your first admin:

```bash
curl -X POST http://localhost:5000/api/admin/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "your-secure-password",
    "email": "admin@thecuppingroom.com"
  }'
```

### 5. Access Admin Dashboard

Open in your browser:
```
http://localhost:5000/admin.html
```

Login with your admin credentials.

---

## 📁 Backend Structure

```
cupping-room/
├── server.js                 # Main Express server
├── admin.html                # Admin dashboard (single file)
├── package.json              # Dependencies
├── .env.example              # Environment template
└── contact.html              # Updated with API integration (provided below)
```

---

## 🔌 API Endpoints

### Authentication
```
POST   /api/admin/register          Register admin (first time only)
POST   /api/admin/login             Login & get JWT token
GET    /api/admin/profile           Get logged-in admin info
```

### Bookings (Table Reservations)
```
POST   /api/bookings                Create new booking
GET    /api/bookings                Get all bookings (admin only)
GET    /api/bookings/:id            Get single booking (admin only)
PATCH  /api/bookings/:id            Update booking status (admin only)
DELETE /api/bookings/:id            Delete booking (admin only)
```

Query parameters for GET /api/bookings:
- `date` - Filter by date (YYYY-MM-DD)
- `status` - Filter by status (pending, confirmed, cancelled)
- `sortBy` - Sort order (newest, guests)

### Inquiries (Contact Form)
```
POST   /api/inquiries               Create new inquiry
GET    /api/inquiries               Get all inquiries (admin only)
PATCH  /api/inquiries/:id           Update inquiry status (admin only)
```

### Workshops
```
POST   /api/workshops               Register for workshop
GET    /api/workshops               Get all registrations (admin only)
PATCH  /api/workshops/:id           Update workshop status (admin only)
```

### Dashboard
```
GET    /api/dashboard/stats         Get all stats & recent data (admin only)
```

---

## 📝 Example Requests

### Create a Booking
```bash
curl -X POST http://localhost:5000/api/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Smith",
    "email": "john@example.com",
    "phone": "+61 2 1234 5678",
    "date": "2025-06-15",
    "time": "12:00 PM",
    "guests": 4,
    "specialRequests": "Window seating please"
  }'
```

### Admin Login
```bash
curl -X POST http://localhost:5000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "your-password"
  }'
```

Returns:
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "admin": {
    "id": "507f1f77bcf86cd799439011",
    "username": "admin",
    "email": "admin@thecuppingroom.com",
    "role": "admin"
  }
}
```

### Get All Bookings (with Token)
```bash
curl -X GET http://localhost:5000/api/bookings \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Create Inquiry
```bash
curl -X POST http://localhost:5000/api/inquiries \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Doe",
    "email": "jane@example.com",
    "phone": "+61 2 9999 8888",
    "subject": "Event Catering",
    "message": "Can you cater our office event?",
    "type": "event"
  }'
```

### Register for Workshop
```bash
curl -X POST http://localhost:5000/api/workshops \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alex Johnson",
    "email": "alex@example.com",
    "phone": "+61 2 5555 4444",
    "workshopType": "espresso",
    "date": "2025-06-18",
    "guests": 1,
    "experience": "beginner"
  }'
```

---

## 🔐 Security Notes

1. **Change JWT_SECRET** in production
   ```
   JWT_SECRET=your-very-long-random-secret-key-minimum-32-characters
   ```

2. **Use environment variables** for all sensitive data
   - Never commit .env to git
   - Add `.env` to `.gitignore`

3. **CORS** is enabled for all origins by default
   - In production, restrict to your domain:
   ```javascript
   app.use(cors({ origin: 'https://www.thecuppingroom.com.au' }));
   ```

4. **Hash passwords** using bcryptjs (already implemented)

5. **JWT expires in 7 days** - Customize in `server.js`:
   ```javascript
   { expiresIn: '7d' }  // Change this value
   ```

---

## 📊 Database Schema

### Booking
```javascript
{
  _id: ObjectId,
  name: String (required),
  email: String (required),
  phone: String,
  date: Date (required),
  time: String (required),
  guests: Number (required),
  specialRequests: String,
  status: String (pending|confirmed|cancelled),
  notes: String,
  createdAt: Date
}
```

### Admin
```javascript
{
  _id: ObjectId,
  username: String (unique, required),
  password: String (hashed, required),
  email: String (unique, required),
  role: String (admin|manager),
  createdAt: Date
}
```

### Inquiry
```javascript
{
  _id: ObjectId,
  name: String (required),
  email: String (required),
  phone: String,
  subject: String,
  message: String (required),
  type: String (general|event|feedback|other),
  status: String (new|read|replied),
  createdAt: Date
}
```

### Workshop
```javascript
{
  _id: ObjectId,
  name: String (required),
  email: String (required),
  phone: String,
  workshopType: String (required),
  date: Date (required),
  guests: Number,
  dietaryRequirements: String,
  experience: String (beginner|intermediate|advanced),
  paid: Boolean,
  status: String (registered|confirmed|attended|cancelled),
  createdAt: Date
}
```

---

## 🌐 Frontend Integration

### Update contact.html (contact form)

Replace the form submission with this:

```javascript
async function handleReserve(e) {
  e.preventDefault();
  
  const data = {
    name: document.getElementById('name').value,
    email: document.getElementById('email').value,
    phone: document.getElementById('phone').value,
    date: document.getElementById('date').value,
    time: document.getElementById('time').value,
    guests: document.getElementById('guests').value,
    specialRequests: document.getElementById('notes').value,
  };

  try {
    const response = await fetch('http://localhost:5000/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      alert('Error: ' + result.error);
      return;
    }

    alert('✅ Booking submitted! We\'ll confirm within 2 hours.');
    e.target.reset();
  } catch (error) {
    alert('Error: ' + error.message);
  }
}
```

### Update inquiries (contact form)

```javascript
async function handleInquiry(e) {
  e.preventDefault();
  
  const data = {
    name: document.getElementById('name').value,
    email: document.getElementById('email').value,
    phone: document.getElementById('phone').value,
    message: document.getElementById('message').value,
    type: 'general',
  };

  try {
    const response = await fetch('http://localhost:5000/api/inquiries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      alert('Error: ' + result.error);
      return;
    }

    alert('✅ Message received! We\'ll get back to you soon.');
    e.target.reset();
  } catch (error) {
    alert('Error: ' + error.message);
  }
}
```

---

## 🚀 Deployment

### Option 1: Heroku

```bash
# Install Heroku CLI
brew tap heroku/brew && brew install heroku

# Login
heroku login

# Create app
heroku create cupping-room-api

# Set environment variables
heroku config:set JWT_SECRET=your-secret
heroku config:set MONGODB_URI=your-mongodb-uri

# Deploy
git push heroku main

# View logs
heroku logs --tail
```

### Option 2: AWS EC2

1. Launch EC2 instance (Ubuntu 20.04)
2. SSH into instance
3. Install Node.js and MongoDB
4. Clone repository
5. Install dependencies & start with pm2

```bash
npm install -g pm2
pm2 start server.js --name "cupping-room"
pm2 save
pm2 startup
```

### Option 3: DigitalOcean App Platform

1. Push code to GitHub
2. Connect DigitalOcean to GitHub repo
3. Create new app
4. Configure environment variables
5. Deploy automatically

---

## 📧 Email Notifications (Optional)

To send booking confirmation emails, update `server.js` with:

```javascript
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

// In booking POST route:
await transporter.sendMail({
  from: process.env.SMTP_FROM,
  to: email,
  subject: '✅ Your Reservation at The Cupping Room',
  text: `Hi ${name},\n\nYour reservation for ${guests} on ${date} at ${time} has been confirmed.\n\nWe look forward to seeing you!`,
});
```

---

## 🐛 Troubleshooting

### "Cannot find module 'express'"
```bash
npm install
```

### "MongoDB connection refused"
- Check if MongoDB is running
- Verify connection string in .env
- Check firewall/network access

### "Admin token invalid"
- Token may have expired (7 days)
- Need to login again
- Check JWT_SECRET matches

### "CORS error"
- Make sure API is running on correct port
- Frontend and backend on different ports need CORS

---

## 📞 Support

For issues or questions:
1. Check logs: `npm run dev`
2. Verify MongoDB connection
3. Check .env file configuration
4. Review API endpoint paths
5. Test with curl commands above

---

## 📜 License

MIT - Free to use and modify

---

**Last Updated:** January 2025
**API Version:** 1.0.0
