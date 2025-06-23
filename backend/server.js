// Complete AI Coach Backend Server with OpenAI Assistant Integration + Password Reset + All Database Storage + Enhanced Goals
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Stripe = require('stripe');
const OpenAI = require('openai');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: [
        /https:\/\/.*--spontaneous-treacle-905d13\.netlify\.app$/,  // Matches any deployment
        'https://spontaneous-treacle-905d13.netlify.app',
        'http://localhost:3000',
        'http://localhost:8080'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Initialize services
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

let openai = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
} else {
  console.log("⚠️ OpenAI API key not found - AI chat will be disabled");
}

// Email configuration
let transporter = null;
if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  transporter = nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
  console.log("📧 Email service configured");
} else {
  console.log("⚠️ Email credentials not found - password reset will be disabled");
}

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/aicoach')
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Updated User Schema with Streak Tracking + Password Reset
const userSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: { type: String, unique: true },
  password: String,
  stripeCustomerId: String,
  subscription: {
    plan: String,
    status: String,
    stripeSubscriptionId: String
  },
  streakData: {
    currentStreak: { type: Number, default: 0 },
    lastLoginDate: { type: Date, default: null },
    longestStreak: { type: Number, default: 0 }
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Goals Schema
const goalSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  frequency: { type: String, enum: ['daily', 'weekly', 'monthly'], required: true },
  completed: { type: Boolean, default: false },
  streak: { type: Number, default: 0 },
  lastCompleted: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

const Goal = mongoose.model('Goal', goalSchema);

// Enhanced Goals Schema for area-based tracking
const enhancedGoalSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  area: { 
    type: String, 
    enum: ['mind', 'spirit', 'body', 'work', 'relationships', 'fun', 'finances'], 
    required: true 
  },
  description: { type: String, required: true },
  tasks: [{ type: String, required: true }],
  completions: {
    type: Map,
    of: [Number], // Array of task indices completed on that date
    default: {}
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const EnhancedGoal = mongoose.model('EnhancedGoal', enhancedGoalSchema);

// Notifications Schema - NEW ADDITION
const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['coaching', 'community', 'system', 'billing'], required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const Notification = mongoose.model('Notification', notificationSchema);

// Chat Rooms Schema - NEW ADDITION
const roomSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isDefault: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const Room = mongoose.model('Room', roomSchema);

// Chat History Schema with Conversation Memory
const chatSchema = new mongoose.Schema({
  userId: String,
  threadId: String,
  messages: [{
    role: String,
    content: String,
    timestamp: { type: Date, default: Date.now }
  }],
  updatedAt: { type: Date, default: Date.now }
});

const Chat = mongoose.model('Chat', chatSchema);

// Updated Community Message Schema - Enhanced for room support
const messageSchema = new mongoose.Schema({
  // Legacy fields (keep for backward compatibility)
  room: String,
  username: String,
  userId: String,
  message: String,
  timestamp: { type: Date, default: Date.now },
  // New fields for enhanced room support
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
  content: String,
  avatar: { type: String, default: 'U' },
  avatarColor: { type: String, default: '#6366f1' },
  createdAt: { type: Date, default: Date.now }
});

const Message = mongoose.model('Message', messageSchema);

// Function to update user streak
async function updateUserStreak(userId) {
  try {
    const user = await User.findById(userId);
    if (!user) return { currentStreak: 0, longestStreak: 0 };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const lastLogin = user.streakData.lastLoginDate;
    let currentStreak = user.streakData.currentStreak || 0;
    let longestStreak = user.streakData.longestStreak || 0;

    if (!lastLogin) {
      currentStreak = 1;
    } else {
      const lastLoginDate = new Date(lastLogin);
      lastLoginDate.setHours(0, 0, 0, 0);
      
      const daysDifference = (today - lastLoginDate) / (1000 * 60 * 60 * 24);
      
      if (daysDifference === 1) {
        currentStreak += 1;
      } else if (daysDifference > 1) {
        currentStreak = 1;
      }
    }

    if (currentStreak > longestStreak) {
      longestStreak = currentStreak;
    }

    await User.findByIdAndUpdate(userId, {
      'streakData.currentStreak': currentStreak,
      'streakData.lastLoginDate': today,
      'streakData.longestStreak': longestStreak
    });

    return { currentStreak, longestStreak };
  } catch (error) {
    console.error('Error updating streak:', error);
    return { currentStreak: 0, longestStreak: 0 };
  }
}

// Create default rooms function
async function createDefaultRooms() {
  try {
    const existingRooms = await Room.countDocuments();
    if (existingRooms === 0) {
      const defaultRooms = [
        { name: 'General Discussion', description: 'Open chat for everyone', isDefault: true },
        { name: 'Business Growth', description: 'Discuss scaling strategies', isDefault: true },
        { name: 'Work-Life Balance', description: 'Managing business and personal life', isDefault: true },
        { name: 'Success Stories', description: 'Share your wins and achievements', isDefault: true }
      ];
      
      for (let roomData of defaultRooms) {
        const room = new Room(roomData);
        await room.save();
      }
      console.log('✅ Default chat rooms created');
    }
  } catch (error) {
    console.error('Error creating default rooms:', error);
  }
}

// JWT Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Routes

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'AI Coach Backend is running!' });
});

// Test route
app.get('/test', (req, res) => {
  res.json({ message: 'New code deployed!', timestamp: new Date() });
});

// Register new user with payment
app.post('/api/auth/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password, plan, stripeCustomerId, paymentIntentId } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      stripeCustomerId,
      subscription: {
        plan,
        status: 'active',
        stripeSubscriptionId: paymentIntentId
      },
      streakData: {
        currentStreak: 1,
        lastLoginDate: new Date(),
        longestStreak: 1
      }
    });

    await user.save();

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email
      },
      streakData: {
        currentStreak: 1,
        longestStreak: 1
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Registration failed', error: error.message });
  }
});

// Login user with streak tracking
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const streakData = await updateUserStreak(user._id);

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email
      },
      streakData
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed', error: error.message });
  }
});

// Verify token
app.get('/api/auth/verify', authenticateToken, (req, res) => {
  res.json({ message: 'Token is valid', user: req.user });
});

// Password Reset Request
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    if (!transporter) {
      return res.status(500).json({ message: 'Email service not configured' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(200).json({ 
        message: 'If an account with that email exists, a password reset link has been sent.' 
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000;
    
    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password.html?token=${resetToken}`;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Password Reset Request - EEH Platform',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #667eea;">Reset Your Password</h2>
          <p>You requested a password reset for your Entrepreneur Emotional Health account.</p>
          <p>Click the button below to reset your password:</p>
          <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">Reset Password</a>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #667eea;">${resetUrl}</p>
          <p><strong>This link will expire in 10 minutes.</strong></p>
          <p>If you didn't request this, please ignore this email.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 14px;">Entrepreneur Emotional Health Platform</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ 
      message: 'If an account with that email exists, a password reset link has been sent.' 
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Error processing password reset request' });
  }
});

// Password Reset Confirmation
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Token and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    
    await user.save();

    res.status(200).json({ message: 'Password reset successful' });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Error resetting password' });
  }
});

// Create Stripe subscription
app.post('/api/payments/create-subscription', async (req, res) => {
  try {
    const { email, planAmount, plan } = req.body;

    const customer = await stripe.customers.create({
      email: email,
      metadata: { plan }
    });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: planAmount,
      currency: 'usd',
      customer: customer.id,
      metadata: { plan }
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      customerId: customer.id
    });
  } catch (error) {
    console.error('Payment error:', error);
    res.status(500).json({ message: 'Payment failed', error: error.message });
  }
});

// Send message to AI Assistant with Conversation Memory
app.post('/api/chat/send', authenticateToken, async (req, res) => {
  try {
    if (!openai) {
      return res.json({ 
        response: "AI chat is temporarily unavailable. Your other app features are working!" 
      });
    }

    const { message } = req.body;
    const userId = req.user.userId;

    const ASSISTANT_ID = "asst_tpShoq1kPGvtcFhMdxb6EmYg";

    let chat = await Chat.findOne({ userId });
    let threadId;

    if (!chat || !chat.threadId) {
      const thread = await openai.beta.threads.create();
      threadId = thread.id;
      
      if (chat) {
        chat.threadId = threadId;
        await chat.save();
      } else {
        chat = new Chat({
          userId,
          threadId,
          messages: []
        });
        await chat.save();
      }
    } else {
      threadId = chat.threadId;
    }

    await openai.beta.threads.messages.create(threadId, {
      role: "user",
      content: message
    });

    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: ASSISTANT_ID
    });

    let runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
    
    let attempts = 0;
    while (runStatus.status !== 'completed' && attempts < 30) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
      attempts++;
    }

    if (runStatus.status !== 'completed') {
      throw new Error('Assistant took too long to respond');
    }

    const messages = await openai.beta.threads.messages.list(threadId);
    const assistantMessage = messages.data.find(msg => msg.role === 'assistant');
    
    if (!assistantMessage) {
      throw new Error('No response from assistant');
    }

    const response = assistantMessage.content[0].text.value;

    chat.messages.push(
      { role: 'user', content: message, timestamp: new Date() },
      { role: 'assistant', content: response, timestamp: new Date() }
    );
    chat.updatedAt = new Date();
    await chat.save();

    res.json({ response });

  } catch (error) {
    console.error('Assistant error:', error);
    
    const fallbacks = [
      "I'm experiencing technical difficulties right now. As an entrepreneur, you know that setbacks are temporary. While I get back online, remember that seeking support shows leadership strength, not weakness.",
      "I'm having connection issues at the moment. In the meantime, consider this: the stress you're feeling as an entrepreneur is valid. Take a deep breath and remember that even the most successful founders face similar challenges.",
      "Technical problems on my end right now. Here's a quick reminder while I reconnect: entrepreneurship is inherently stressful, but you're building something meaningful. That pressure you feel? It's often proportional to the impact you're creating."
    ];
    
    res.status(500).json({ 
      message: 'Failed to get AI response', 
      error: error.message,
      response: fallbacks[Math.floor(Math.random() * fallbacks.length)]
    });
  }
});

// Save chat history
app.post('/api/chat/save', authenticateToken, async (req, res) => {
  try {
    const { messages } = req.body;
    const userId = req.user.userId;

    await Chat.findOneAndUpdate(
      { userId },
      { messages, updatedAt: new Date() },
      { upsert: true }
    );

    res.json({ message: 'Chat saved successfully' });
  } catch (error) {
    console.error('Save chat error:', error);
    res.status(500).json({ message: 'Failed to save chat' });
  }
});

// Get chat history
app.get('/api/chat/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const chat = await Chat.findOne({ userId });
    
    res.json({ messages: chat ? chat.messages : [] });
  } catch (error) {
    console.error('Get chat history error:', error);
    res.status(500).json({ message: 'Failed to get chat history' });
  }
});

// Get community messages (legacy support)
app.get('/api/community/messages/:room', authenticateToken, async (req, res) => {
  try {
    const { room } = req.params;
    const messages = await Message.find({ room })
      .sort({ timestamp: -1 })
      .limit(50)
      .sort({ timestamp: 1 });

    res.json(messages);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: 'Failed to get messages' });
  }
});

// Dashboard stats with real streak tracking
app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const user = await User.findById(userId);
    
    const chat = await Chat.findOne({ userId });
    const totalSessions = chat ? chat.messages.filter(m => m.role === 'user').length : 0;
    
    const communityMessages = await Message.countDocuments({ userId });
    
    const currentStreak = user?.streakData?.currentStreak || 0;
    
    res.json({
      totalSessions,
      streak: currentStreak,
      communityMessages,
      longestStreak: user?.streakData?.longestStreak || 0
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ message: 'Failed to get stats' });
  }
});

// Get user profile with streak data
app.get('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        subscription: user.subscription,
        streakData: user.streakData,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ message: 'Failed to get profile' });
  }
});

// Billing endpoints
app.get('/api/billing/info', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({
      subscription: user.subscription,
      customer: user.stripeCustomerId
    });
  } catch (error) {
    console.error('Billing info error:', error);
    res.status(500).json({ message: 'Failed to get billing info' });
  }
});

// Community - Save message (legacy support)
app.post('/api/community/send', authenticateToken, async (req, res) => {
  try {
    const { room, message } = req.body;
    const userId = req.user.userId;
    
    const user = await User.findById(userId);
    const username = `${user.firstName} ${user.lastName}`;
    
    const newMessage = new Message({
      room,
      username,
      userId,
      message,
      content: message, // For compatibility
      timestamp: new Date()
    });
    
    await newMessage.save();
    
    res.json({ 
      message: 'Message sent successfully',
      messageData: newMessage
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Failed to send message' });
  }
});

// ==========================================
// GOALS API ROUTES (Original)
// ==========================================

app.get('/api/goals', authenticateToken, async (req, res) => {
  try {
    const goals = await Goal.find({ userId: req.user.userId }).sort({ createdAt: -1 });
    res.json(goals);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch goals' });
  }
});

app.post('/api/goals', authenticateToken, async (req, res) => {
  try {
    const goal = new Goal({
      userId: req.user.userId,
      title: req.body.title,
      frequency: req.body.frequency
    });
    await goal.save();
    res.json(goal);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create goal' });
  }
});

app.put('/api/goals/:id/complete', authenticateToken, async (req, res) => {
  try {
    const goal = await Goal.findOne({ _id: req.params.id, userId: req.user.userId });
    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }
    
    if (taskIndex >= goal.tasks.length) {
      return res.status(400).json({ error: 'Invalid task index' });
    }
    
    const today = new Date().toISOString().split('T')[0];
    
    // Initialize today's completions if not exists
    if (!goal.completions.get(today)) {
      goal.completions.set(today, []);
    }
    
    const todayCompletions = goal.completions.get(today);
    const taskCompleted = todayCompletions.includes(taskIndex);
    
    if (taskCompleted) {
      // Remove task from completions
      const updatedCompletions = todayCompletions.filter(index => index !== taskIndex);
      goal.completions.set(today, updatedCompletions);
    } else {
      // Add task to completions
      todayCompletions.push(taskIndex);
      goal.completions.set(today, todayCompletions);
    }
    
    goal.updatedAt = new Date();
    await goal.save();
    
    res.json(goal);
  } catch (error) {
    console.error('Toggle task error:', error);
    res.status(500).json({ error: 'Failed to toggle task' });
  }
});

// Update goal description or tasks
app.put('/api/goals/enhanced/:goalId', authenticateToken, async (req, res) => {
  try {
    const { goalId } = req.params;
    const { description, tasks } = req.body;
    
    const goal = await EnhancedGoal.findOne({ 
      _id: goalId, 
      userId: req.user.userId 
    });
    
    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }
    
    if (description) {
      goal.description = description;
    }
    
    if (tasks && Array.isArray(tasks) && tasks.length > 0) {
      goal.tasks = tasks.filter(task => task.trim());
    }
    
    goal.updatedAt = new Date();
    await goal.save();
    
    res.json(goal);
  } catch (error) {
    console.error('Update goal error:', error);
    res.status(500).json({ error: 'Failed to update goal' });
  }
});

// Delete enhanced goal
app.delete('/api/goals/enhanced/:goalId', authenticateToken, async (req, res) => {
  try {
    const { goalId } = req.params;
    
    const result = await EnhancedGoal.findOneAndDelete({ 
      _id: goalId, 
      userId: req.user.userId 
    });
    
    if (!result) {
      return res.status(404).json({ error: 'Goal not found' });
    }
    
    res.json({ message: 'Goal deleted successfully' });
  } catch (error) {
    console.error('Delete goal error:', error);
    res.status(500).json({ error: 'Failed to delete goal' });
  }
});

// Get goal statistics and insights
app.get('/api/goals/enhanced/stats', authenticateToken, async (req, res) => {
  try {
    const goals = await EnhancedGoal.find({ userId: req.user.userId });
    
    if (goals.length === 0) {
      return res.json({
        totalGoals: 0,
        activeAreas: 0,
        totalCompletions: 0,
        currentStreaks: {},
        insights: []
      });
    }
    
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    let totalCompletions = 0;
    let currentStreaks = {};
    let insights = [];
    
    // Calculate stats for each goal
    goals.forEach(goal => {
      const completions = goal.completions;
      
      // Count total task completions
      for (let [date, taskIndices] of completions) {
        totalCompletions += taskIndices.length;
      }
      
      // Calculate current streak for this goal
      let streak = 0;
      let checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - 1); // Start from yesterday
      
      while (checkDate >= new Date(goal.createdAt)) {
        const dateStr = checkDate.toISOString().split('T')[0];
        const dayCompletions = completions.get(dateStr) || [];
        
        if (dayCompletions.length === goal.tasks.length) {
          streak++;
        } else {
          break;
        }
        
        checkDate.setDate(checkDate.getDate() - 1);
      }
      
      currentStreaks[goal.area] = streak;
      
      // Generate insights
      if (streak >= 7) {
        insights.push({
          type: 'achievement',
          area: goal.area,
          message: `Amazing! You're on a ${streak}-day streak in ${goal.area}!`
        });
      }
      
      // Check for consistency patterns
      const last7Days = [];
      for (let i = 0; i < 7; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() - i);
        const dateStr = checkDate.toISOString().split('T')[0];
        const dayCompletions = completions.get(dateStr) || [];
        last7Days.push(dayCompletions.length === goal.tasks.length);
      }
      
      const completionRate = last7Days.filter(Boolean).length / 7;
      if (completionRate >= 0.8) {
        insights.push({
          type: 'momentum',
          area: goal.area,
          message: `You're building great momentum in ${goal.area} - ${Math.round(completionRate * 100)}% completion this week!`
        });
      } else if (completionRate < 0.3) {
        insights.push({
          type: 'encouragement',
          area: goal.area,
          message: `Your ${goal.area} goal needs attention. Small daily actions create big changes!`
        });
      }
    });
    
    res.json({
      totalGoals: goals.length,
      activeAreas: goals.length,
      totalCompletions,
      currentStreaks,
      insights: insights.slice(0, 5) // Limit to 5 insights
    });
    
  } catch (error) {
    console.error('Get goal stats error:', error);
    res.status(500).json({ error: 'Failed to get goal statistics' });
  }
});

// Get goal completion data for calendar view
app.get('/api/goals/enhanced/:goalId/calendar/:year/:month', authenticateToken, async (req, res) => {
  try {
    const { goalId, year, month } = req.params;
    
    const goal = await EnhancedGoal.findOne({ 
      _id: goalId, 
      userId: req.user.userId 
    });
    
    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }
    
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0);
    
    const calendarData = {};
    
    // Get all completions for the month
    for (let [dateStr, taskIndices] of goal.completions) {
      const date = new Date(dateStr);
      if (date >= startDate && date <= endDate) {
        calendarData[dateStr] = {
          completedTasks: taskIndices.length,
          totalTasks: goal.tasks.length,
          isComplete: taskIndices.length === goal.tasks.length
        };
      }
    }
    
    res.json({
      goal: {
        area: goal.area,
        description: goal.description,
        tasks: goal.tasks
      },
      calendar: calendarData
    });
    
  } catch (error) {
    console.error('Get calendar data error:', error);
    res.status(500).json({ error: 'Failed to get calendar data' });
  }
});

// Bulk update completions (for manual editing)
app.post('/api/goals/enhanced/:goalId/bulk-update', authenticateToken, async (req, res) => {
  try {
    const { goalId } = req.params;
    const { date, completedTaskIndices } = req.body;
    
    if (!date || !Array.isArray(completedTaskIndices)) {
      return res.status(400).json({ error: 'Date and completed task indices array are required' });
    }
    
    const goal = await EnhancedGoal.findOne({ 
      _id: goalId, 
      userId: req.user.userId 
    });
    
    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }
    
    // Validate task indices
    const validIndices = completedTaskIndices.filter(index => 
      typeof index === 'number' && index >= 0 && index < goal.tasks.length
    );
    
    goal.completions.set(date, validIndices);
    goal.updatedAt = new Date();
    await goal.save();
    
    res.json(goal);
  } catch (error) {
    console.error('Bulk update error:', error);
    res.status(500).json({ error: 'Failed to update completions' });
  }
});

// Create notification for goal milestone
async function createGoalNotification(userId, type, title, content) {
  try {
    const notification = new Notification({
      userId,
      type: 'coaching',
      title,
      content
    });
    await notification.save();
  } catch (error) {
    console.error('Failed to create goal notification:', error);
  }
}

// Background job to check for goal achievements (call this daily)
async function checkGoalAchievements() {
  try {
    const goals = await EnhancedGoal.find({});
    const today = new Date().toISOString().split('T')[0];
    
    for (let goal of goals) {
      const todayCompletions = goal.completions.get(today) || [];
      
      // Check if all tasks completed today
      if (todayCompletions.length === goal.tasks.length) {
        // Calculate streak
        let streak = 1;
        let checkDate = new Date();
        checkDate.setDate(checkDate.getDate() - 1);
        
        while (checkDate >= new Date(goal.createdAt)) {
          const dateStr = checkDate.toISOString().split('T')[0];
          const dayCompletions = goal.completions.get(dateStr) || [];
          
          if (dayCompletions.length === goal.tasks.length) {
            streak++;
          } else {
            break;
          }
          
          checkDate.setDate(checkDate.getDate() - 1);
        }
        
        // Create notifications for milestones
        if ([7, 14, 30, 60, 100].includes(streak)) {
          await createGoalNotification(
            goal.userId,
            'coaching',
            `${streak}-Day Streak Achievement!`,
            `Congratulations! You've maintained a ${streak}-day streak in your ${goal.area} goal. Keep up the amazing work!`
          );
        }
      }
    }
  } catch (error) {
    console.error('Goal achievement check error:', error);
  }
}

// ==========================================
// NOTIFICATIONS API ROUTES - NEW ADDITION
// ==========================================

app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.userId })
      .sort({ createdAt: -1 });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

app.put('/api/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      { read: true },
      { new: true }
    );
    res.json(notification);
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

app.delete('/api/notifications/:id', authenticateToken, async (req, res) => {
  try {
    await Notification.findOneAndDelete({ _id: req.params.id, userId: req.user.userId });
    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

// Updated notifications endpoints
app.get('/api/notifications/unread-count', authenticateToken, async (req, res) => {
  try {
    const count = await Notification.countDocuments({ 
      userId: req.user.userId, 
      read: false 
    });
    res.json({ count });
  } catch (error) {
    res.json({ count: 0 });
  }
});

app.get('/api/notifications/recent', authenticateToken, async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.userId })
      .sort({ createdAt: -1 })
      .limit(5);
    res.json(notifications);
  } catch (error) {
    res.json([]);
  }
});

// ==========================================
// CHAT ROOMS API ROUTES - NEW ADDITION
// ==========================================

app.get('/api/rooms', authenticateToken, async (req, res) => {
  try {
    const rooms = await Room.find().populate('createdBy', 'firstName lastName');
    
    const roomsWithCounts = await Promise.all(rooms.map(async (room) => {
      const messageCount = await Message.countDocuments({ roomId: room._id });
      return {
        ...room.toObject(),
        messageCount
      };
    }));
    
    res.json(roomsWithCounts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
});

app.post('/api/rooms', authenticateToken, async (req, res) => {
  try {
    const room = new Room({
      name: req.body.name,
      description: req.body.description,
      createdBy: req.user.userId
    });
    await room.save();
    res.json(room);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create room' });
  }
});

app.get('/api/rooms/:id/messages', authenticateToken, async (req, res) => {
  try {
    const messages = await Message.find({ roomId: req.params.id })
      .sort({ createdAt: 1 })
      .limit(100);
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

app.post('/api/rooms/:id/messages', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    const message = new Message({
      roomId: req.params.id,
      userId: req.user.userId,
      username: user ? `${user.firstName} ${user.lastName}` : 'User',
      avatar: req.body.avatar || 'U',
      content: req.body.content,
      message: req.body.content, // For compatibility
      avatarColor: req.body.avatarColor || '#6366f1'
    });
    await message.save();
    res.json(message);
  } catch (error) {
    res.status(500).json({ error: 'Failed to send message' });
  }
});

app.delete('/api/rooms/:id', authenticateToken, async (req, res) => {
  try {
    const room = await Room.findOne({ _id: req.params.id, createdBy: req.user.userId });
    if (!room) {
      return res.status(404).json({ error: 'Room not found or you do not have permission to delete it' });
    }
    
    // Delete all messages in the room
    await Message.deleteMany({ roomId: req.params.id });
    
    // Delete the room
    await Room.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Room deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete room' });
  }
});

// Health check endpoint for monitoring
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      openai: openai ? 'available' : 'unavailable',
      stripe: process.env.STRIPE_SECRET_KEY ? 'configured' : 'not configured',
      email: transporter ? 'configured' : 'not configured'
    }
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    message: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { error: error.message })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Endpoint not found' });
});

// Initialize default rooms after MongoDB connection
mongoose.connection.once('open', () => {
  createDefaultRooms();
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔑 JWT Secret: ${process.env.JWT_SECRET ? 'configured' : 'using default'}`);
  console.log(`🤖 OpenAI Assistant: ${openai ? 'ready (asst_tpShoq1kPGvtcFhMdxb6EmYg)' : 'disabled'}`);
  console.log(`💳 Stripe: ${process.env.STRIPE_SECRET_KEY ? 'ready' : 'not configured'}`);
  console.log(`📧 Email: ${transporter ? 'ready' : 'not configured'}`);
  console.log(`💾 Database Storage: Goals ✅ Enhanced Goals ✅ Notifications ✅ Chat Rooms ✅`);
});'Goal not found' });
    }
    
    goal.completed = !goal.completed;
    if (goal.completed) {
      goal.lastCompleted = new Date();
      goal.streak += 1;
    } else {
      goal.streak = Math.max(0, goal.streak - 1);
    }
    
    await goal.save();
    res.json(goal);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update goal' });
  }
});

app.delete('/api/goals/:id', authenticateToken, async (req, res) => {
  try {
    await Goal.findOneAndDelete({ _id: req.params.id, userId: req.user.userId });
    res.json({ message: 'Goal deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete goal' });
  }
});

// ==========================================
// ENHANCED GOALS API ROUTES (New)
// ==========================================

// Get all enhanced goals for user
app.get('/api/goals/enhanced', authenticateToken, async (req, res) => {
  try {
    const goals = await EnhancedGoal.find({ userId: req.user.userId }).sort({ createdAt: -1 });
    res.json(goals);
  } catch (error) {
    console.error('Get enhanced goals error:', error);
    res.status(500).json({ error: 'Failed to fetch goals' });
  }
});

// Create new enhanced goal
app.post('/api/goals/enhanced', authenticateToken, async (req, res) => {
  try {
    const { area, description, tasks } = req.body;
    
    if (!area || !description || !tasks || tasks.length === 0) {
      return res.status(400).json({ error: 'Area, description, and at least one task are required' });
    }

    // Check if user already has a goal in this area
    const existingGoal = await EnhancedGoal.findOne({ 
      userId: req.user.userId, 
      area: area 
    });
    
    if (existingGoal) {
      return res.status(400).json({ 
        error: `You already have a goal in the ${area} area. Delete the existing one first.` 
      });
    }

    const goal = new EnhancedGoal({
      userId: req.user.userId,
      area,
      description,
      tasks: tasks.filter(task => task.trim()) // Filter out empty tasks
    });
    
    await goal.save();
    res.json(goal);
  } catch (error) {
    console.error('Create enhanced goal error:', error);
    res.status(500).json({ error: 'Failed to create goal' });
  }
});

// Toggle task completion for a specific goal
app.post('/api/goals/enhanced/:goalId/toggle-task', authenticateToken, async (req, res) => {
  try {
    const { goalId } = req.params;
    const { taskIndex } = req.body;
    
    if (typeof taskIndex !== 'number' || taskIndex < 0) {
      return res.status(400).json({ error: 'Valid task index is required' });
    }
    
    const goal = await EnhancedGoal.findOne({ 
      _id: goalId, 
      userId: req.user.userId 
    });
    
    if (!goal) {
      return res.status(404).json({ error:
