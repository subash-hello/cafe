const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const path = require('path');
const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cupping-room';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(express.json());
// Serve static site files from project root so HTML pages are accessible
app.use(express.static(path.join(__dirname)));

// MongoDB Connection
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.log('❌ MongoDB error:', err));

// ============= SCHEMAS =============

// Booking Schema
const bookingSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: String,
  date: { type: Date, required: true },
  time: { type: String, required: true },
  guests: { type: Number, required: true },
  specialRequests: String,
  status: { type: String, enum: ['pending', 'confirmed', 'cancelled'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
  notes: String,
});

// Admin Schema
const adminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  role: { type: String, enum: ['admin', 'manager'], default: 'admin' },
  createdAt: { type: Date, default: Date.now },
});

// Contact/Inquiry Schema
const inquirySchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: String,
  subject: String,
  message: { type: String, required: true },
  type: { type: String, enum: ['general', 'event', 'feedback', 'other'], default: 'general' },
  status: { type: String, enum: ['new', 'read', 'replied'], default: 'new' },
  createdAt: { type: Date, default: Date.now },
});

// Workshop Registration Schema
const workshopSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: String,
  workshopType: { type: String, required: true }, // 'espresso', 'cupping', 'filter', 'latte-art', etc.
  date: { type: Date, required: true },
  guests: { type: Number, default: 1 },
  dietaryRequirements: String,
  experience: { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' },
  paid: { type: Boolean, default: false },
  status: { type: String, enum: ['registered', 'confirmed', 'attended', 'cancelled'], default: 'registered' },
  createdAt: { type: Date, default: Date.now },
});

// Menu Item Schema
const menuItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  price: { type: Number, required: true },
  category: { type: String, required: true },
  imageUrl: String,
  dietaryTags: [String],
  isAvailable: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

// Models
const Booking = mongoose.model('Booking', bookingSchema);
const Admin = mongoose.model('Admin', adminSchema);
const Inquiry = mongoose.model('Inquiry', inquirySchema);
const Workshop = mongoose.model('Workshop', workshopSchema);
const MenuItem = mongoose.model('MenuItem', menuItemSchema);

// ============= AUTHENTICATION MIDDLEWARE =============

const authenticateAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// ============= ROUTES: BOOKINGS =============

// Create Booking
app.post('/api/bookings', async (req, res) => {
  try {
    const { name, email, phone, date, time, guests, specialRequests } = req.body;

    // Validate required fields
    if (!name || !email || !date || !time || !guests) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if time slot is available
    const existingBooking = await Booking.findOne({
      date: new Date(date),
      time: time,
      status: { $ne: 'cancelled' },
    });

    if (existingBooking) {
      return res.status(400).json({ error: 'This time slot is not available' });
    }

    const booking = new Booking({
      name,
      email,
      phone,
      date: new Date(date),
      time,
      guests,
      specialRequests,
    });

    await booking.save();
    
    // Send confirmation email (optional)
    console.log(`📧 Booking confirmation email would be sent to ${email}`);

    res.status(201).json({
      message: 'Booking successful! We\'ll confirm within 2 hours.',
      booking,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get All Bookings (Admin Only)
app.get('/api/bookings', authenticateAdmin, async (req, res) => {
  try {
    const { date, status, sortBy } = req.query;
    let query = {};

    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      query.date = { $gte: startDate, $lt: endDate };
    }

    if (status) {
      query.status = status;
    }

    let sortOptions = { date: 1, time: 1 };
    if (sortBy === 'newest') sortOptions = { createdAt: -1 };
    if (sortBy === 'guests') sortOptions = { guests: -1 };

    const bookings = await Booking.find(query).sort(sortOptions);
    
    const stats = {
      total: bookings.length,
      pending: bookings.filter(b => b.status === 'pending').length,
      confirmed: bookings.filter(b => b.status === 'confirmed').length,
      cancelled: bookings.filter(b => b.status === 'cancelled').length,
      totalGuests: bookings.reduce((sum, b) => sum + b.guests, 0),
    };

    res.json({ bookings, stats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Single Booking
app.get('/api/bookings/:id', authenticateAdmin, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    res.json(booking);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update Booking Status
app.patch('/api/bookings/:id', authenticateAdmin, async (req, res) => {
  try {
    const { status, notes } = req.body;
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status, notes },
      { new: true }
    );
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    res.json({ message: 'Booking updated', booking });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete Booking
app.delete('/api/bookings/:id', authenticateAdmin, async (req, res) => {
  try {
    const booking = await Booking.findByIdAndDelete(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    res.json({ message: 'Booking deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= ROUTES: INQUIRIES =============

// Create Inquiry/Contact
app.post('/api/inquiries', async (req, res) => {
  try {
    const { name, email, phone, subject, message, type } = req.body;
    
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const inquiry = new Inquiry({
      name,
      email,
      phone,
      subject,
      message,
      type,
    });

    await inquiry.save();
    res.status(201).json({ message: 'Inquiry received! We\'ll get back to you soon.', inquiry });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get All Inquiries (Admin Only)
app.get('/api/inquiries', authenticateAdmin, async (req, res) => {
  try {
    const { status, type } = req.query;
    let query = {};
    if (status) query.status = status;
    if (type) query.type = type;

    const inquiries = await Inquiry.find(query).sort({ createdAt: -1 });
    res.json(inquiries);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update Inquiry Status
app.patch('/api/inquiries/:id', authenticateAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const inquiry = await Inquiry.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!inquiry) return res.status(404).json({ error: 'Inquiry not found' });
    res.json(inquiry);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= ROUTES: WORKSHOPS =============

// Register for Workshop
app.post('/api/workshops', async (req, res) => {
  try {
    const { name, email, phone, workshopType, date, guests, dietaryRequirements, experience } = req.body;
    
    if (!name || !email || !workshopType || !date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const workshop = new Workshop({
      name,
      email,
      phone,
      workshopType,
      date: new Date(date),
      guests,
      dietaryRequirements,
      experience,
    });

    await workshop.save();
    res.status(201).json({ message: 'Workshop registration successful!', workshop });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get All Workshops (Admin Only)
app.get('/api/workshops', authenticateAdmin, async (req, res) => {
  try {
    const { workshopType, status } = req.query;
    let query = {};
    if (workshopType) query.workshopType = workshopType;
    if (status) query.status = status;

    const workshops = await Workshop.find(query).sort({ date: 1 });
    res.json(workshops);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update Workshop Status
app.patch('/api/workshops/:id', authenticateAdmin, async (req, res) => {
  try {
    const { status, paid } = req.body;
    const workshop = await Workshop.findByIdAndUpdate(
      req.params.id,
      { status, paid },
      { new: true }
    );
    res.json(workshop);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= ROUTES: MENU =============

// Get all menu items
app.get('/api/menu', async (req, res) => {
  try {
    const { category, isAvailable } = req.query;
    let query = {};
    if (category) query.category = category;
    if (isAvailable !== undefined) query.isAvailable = isAvailable === 'true';

    const menuItems = await MenuItem.find(query).sort({ category: 1, name: 1 });
    res.json(menuItems);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create menu item (Admin only)
app.post('/api/menu', authenticateAdmin, async (req, res) => {
  try {
    const menuItem = new MenuItem(req.body);
    await menuItem.save();
    res.status(201).json(menuItem);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update menu item (Admin only)
app.patch('/api/menu/:id', authenticateAdmin, async (req, res) => {
  try {
    const menuItem = await MenuItem.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!menuItem) return res.status(404).json({ error: 'Menu item not found' });
    res.json(menuItem);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete menu item (Admin only)
app.delete('/api/menu/:id', authenticateAdmin, async (req, res) => {
  try {
    const menuItem = await MenuItem.findByIdAndDelete(req.params.id);
    if (!menuItem) return res.status(404).json({ error: 'Menu item not found' });
    res.json({ message: 'Menu item deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= ROUTES: ADMIN AUTH =============

// Admin Register (First time setup only)
app.post('/api/admin/register', async (req, res) => {
  try {
    const { username, password, email } = req.body;
    
    // Check if admin already exists
    const existingAdmin = await Admin.findOne();
    if (existingAdmin) {
      return res.status(400).json({ error: 'Admin user already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = new Admin({
      username,
      password: hashedPassword,
      email,
    });

    await admin.save();
    res.status(201).json({ message: 'Admin registered successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin Login
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const admin = await Admin.findOne({ username });
    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: admin._id, username: admin.username, role: admin.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      admin: { id: admin._id, username: admin.username, email: admin.email, role: admin.role },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Admin Info
app.get('/api/admin/profile', authenticateAdmin, async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.id).select('-password');
    res.json(admin);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= ROUTES: DASHBOARD STATS =============

// Get Dashboard Stats
app.get('/api/dashboard/stats', authenticateAdmin, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const stats = {
      bookings: {
        total: await Booking.countDocuments(),
        today: await Booking.countDocuments({ date: { $gte: today, $lt: tomorrow } }),
        pending: await Booking.countDocuments({ status: 'pending' }),
        confirmed: await Booking.countDocuments({ status: 'confirmed' }),
      },
      inquiries: {
        total: await Inquiry.countDocuments(),
        new: await Inquiry.countDocuments({ status: 'new' }),
      },
      workshops: {
        total: await Workshop.countDocuments(),
        upcoming: await Workshop.countDocuments({ date: { $gte: new Date() } }),
      },
      recentBookings: await Booking.find().sort({ createdAt: -1 }).limit(5),
      recentInquiries: await Inquiry.find().sort({ createdAt: -1 }).limit(5),
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Seed Mock Data Route
app.post('/api/dashboard/seed', async (req, res) => {
  try {
    // Delete existing data to start fresh
    await Booking.deleteMany({});
    await Inquiry.deleteMany({});
    await Workshop.deleteMany({});
    await MenuItem.deleteMany({});

    // Create Mock Bookings
    const mockBookings = [
      { name: 'Liam Neeson', email: 'liam@taken.com', phone: '+61 412 345 678', date: new Date(), time: '9:00 AM', guests: 2, status: 'confirmed', specialRequests: 'Window table if possible.' },
      { name: 'Emma Watson', email: 'emma@hogwarts.edu', phone: '+61 498 765 432', date: new Date(), time: '11:30 AM', guests: 4, status: 'pending', specialRequests: 'Gluten-free menu options.' },
      { name: 'Keanu Reeves', email: 'keanu@matrix.co', phone: '+61 455 667 788', date: new Date(), time: '1:00 PM', guests: 1, status: 'confirmed', specialRequests: 'Just good coffee.' },
      { name: 'Scarlett Johansson', email: 'scarlett@avengers.org', phone: '+61 422 334 455', date: new Date(Date.now() + 86400000), time: '10:00 AM', guests: 6, status: 'pending', specialRequests: 'Birthday celebration.' },
      { name: 'Robert Downey Jr.', email: 'rdj@stark.com', phone: '+61 477 889 900', date: new Date(Date.now() - 86400000), time: '8:00 AM', guests: 3, status: 'confirmed' }
    ];
    await Booking.insertMany(mockBookings);

    // Create Mock Inquiries
    const mockInquiries = [
      { name: 'Chris Evans', email: 'cap@shield.org', phone: '+61 411 222 333', subject: 'Corporate Event Catering', message: 'Would love to inquire about hosting a corporate brunch for 30 people on June 15th.', type: 'event', status: 'new' },
      { name: 'Margot Robbie', email: 'margot@barbie.world', phone: '+61 499 000 111', subject: 'Latte Art Workshop', message: 'Hi! Is the Latte Art Masterclass on June 8th suitable for absolute beginners?', type: 'general', status: 'read' },
      { name: 'Chris Hemsworth', email: 'thor@asgard.com', phone: '+61 433 444 555', subject: 'Feedback on Coffee', message: 'The single-origin Colombia roast is out of this world. Best flat white in Canberra!', type: 'feedback', status: 'replied' }
    ];
    await Inquiry.insertMany(mockInquiries);

    // Create Mock Workshops
    const mockWorkshops = [
      { name: 'Tom Holland', email: 'spidey@web.com', phone: '+61 422 555 888', workshopType: 'espresso', date: new Date(Date.now() + 500000000), guests: 2, experience: 'beginner', paid: true, status: 'confirmed' },
      { name: 'Zendaya Coleman', email: 'zendaya@euphoria.co', phone: '+61 488 999 000', workshopType: 'latte-art', date: new Date(Date.now() + 900000000), guests: 1, experience: 'intermediate', paid: true, status: 'confirmed' },
      { name: 'Benedict Cumberbatch', email: 'doctor@strange.co', phone: '+61 444 777 111', workshopType: 'cupping', date: new Date(Date.now() + 200000000), guests: 3, experience: 'advanced', paid: false, status: 'registered' }
    ];
    await Workshop.insertMany(mockWorkshops);

    // Create Mock Menu Items
    const mockMenuItems = [
      { name: 'Smashed Avo Toast', description: 'House sourdough, whipped goat curd, heirloom tomatoes, dukkah, micro herbs, 63° egg. A Cupping Room essential.', price: 22.00, category: 'brunch', imageUrl: 'https://images.squarespace-cdn.com/content/v1/6685ff63a56e7c083753f6a0/1725236761601-LAVO5KIS0YD3NL3GN3DP/Cupping-Room_August-40.jpg?format=800w', dietaryTags: ['V'], isAvailable: true },
      { name: 'Shakshuka', description: 'Slow-cooked spiced tomato and capsicum, poached eggs, labneh, za\'atar, warm pita bread. Rich, warming, unforgettable.', price: 24.00, category: 'brunch', imageUrl: 'https://images.squarespace-cdn.com/content/v1/6685ff63a56e7c083753f6a0/1750660251981-F7ACTKIDP12U30HOTIZK/DSC05596.JPG?format=800w', dietaryTags: ['V', 'GF'], isAvailable: true },
      { name: 'Grain Bowl', description: 'Roasted seasonal grains, charred broccolini, pickled red onion, tahini dressing, crispy chickpeas, soft egg.', price: 23.00, category: 'brunch', imageUrl: 'https://images.squarespace-cdn.com/content/v1/6685ff63a56e7c083753f6a0/1725236842781-PIZKSVRCEJQJJS8MRLT2/Cupping-Room_August-247.jpg?format=800w', dietaryTags: ['VE', 'GF'], isAvailable: true },
      { name: 'Pulled Mushroom Toast', description: 'Slow-roasted king oyster mushrooms, truffle oil, aged ricotta, hazelnut crumb, sourdough.', price: 21.00, category: 'brunch', imageUrl: 'https://images.squarespace-cdn.com/content/v1/6685ff63a56e7c083753f6a0/1757486707532-0NNQ0PD32169326NX5XD/DSC00869.JPG?format=800w', dietaryTags: ['V', 'N'], isAvailable: true },
      { name: 'Eggs Benedict', description: 'Free-range eggs, house hollandaise, prosciutto or smoked salmon on house English muffin.', price: 24.50, category: 'brunch', imageUrl: 'https://images.squarespace-cdn.com/content/v1/6685ff63a56e7c083753f6a0/1750660389493-JT14R3NFNIWE2XNWSWIG/DSC05878.JPG?format=800w', dietaryTags: ['GF'], isAvailable: true },
      { name: 'French Toast', description: 'Brioche, whipped mascarpone, caramelised figs, candied walnuts, warm honey, freeze-dried strawberry.', price: 22.00, category: 'brunch', imageUrl: 'https://images.squarespace-cdn.com/content/v1/6685ff63a56e7c083753f6a0/1750660282342-6VRKDKKBNNUX36QBSLQC/DSC05651.JPG?format=800w', dietaryTags: ['V', 'N'], isAvailable: true },
      
      { name: 'House Espresso', description: 'Our signature seasonal blend. Notes of dark chocolate, plum, and hazelnut.', price: 4.50, category: 'espresso', imageUrl: '', dietaryTags: [], isAvailable: true },
      { name: 'Single Origin Espresso', description: 'Rotating single origin offering. Ask our baristas for today\'s profile.', price: 5.50, category: 'espresso', imageUrl: '', dietaryTags: [], isAvailable: true },
      { name: 'Batch Brew', description: 'Rotating single origin filter coffee. Clean, complex, and ready to pour.', price: 5.50, category: 'filter', imageUrl: '', dietaryTags: [], isAvailable: true },
      { name: 'Cold Brew', description: 'Steeped for 18 hours. Smooth, sweet, and highly caffeinated.', price: 6.00, category: 'filter', imageUrl: '', dietaryTags: [], isAvailable: true },
      
      { name: 'Hot Chocolate', description: 'Mörk 70% dark chocolate.', price: 6.00, category: 'nonCoffee', imageUrl: '', dietaryTags: [], isAvailable: true },
      { name: 'Chai Latte', description: 'Prana Chai brewed with soy milk and honey.', price: 6.00, category: 'nonCoffee', imageUrl: '', dietaryTags: [], isAvailable: true },
    ];
    await MenuItem.insertMany(mockMenuItems);

    res.status(201).json({ message: 'Database populated with high-quality mock data successfully!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= ERROR HANDLING =============

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// ============= START SERVER =============

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════╗
║   🚀 Cupping Room Backend Server   ║
║   Running on port ${PORT}               ║
╚════════════════════════════════════╝

✅ API Endpoints:
  POST   /api/bookings              - Create booking
  GET    /api/bookings              - Get all bookings (admin)
  PATCH  /api/bookings/:id          - Update booking status
  
  POST   /api/inquiries             - Create inquiry
  GET    /api/inquiries             - Get all inquiries (admin)
  
  POST   /api/workshops             - Register workshop
  GET    /api/workshops             - Get all workshops (admin)
  
  POST   /api/admin/register        - Register admin (first time)
  POST   /api/admin/login           - Admin login
  GET    /api/admin/profile         - Get admin profile
  
  GET    /api/dashboard/stats       - Get dashboard stats

📝 To register admin:
  curl -X POST http://localhost:5000/api/admin/register \\
    -H "Content-Type: application/json" \\
    -d '{"username":"admin","password":"password123","email":"admin@thecuppingroom.com"}'
  `);
});

module.exports = app;
