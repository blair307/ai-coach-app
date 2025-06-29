// Complete AI Coach Backend Server with Enhanced Reply Notifications
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

// Notifications Schema - ENHANCED FOR REPLIES
const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['coaching', 'community', 'system', 'billing'], required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  read: { type: Boolean, default: false },
  isReply: { type: Boolean, default: false }, // NEW: Mark reply notifications
  priority: { type: String, enum: ['low', 'normal', 'high'], default: 'normal' }, // NEW: Priority level
  createdAt: { type: Date, default: Date.now }
});

const Notification = mongoose.model('Notification', notificationSchema);

// Chat Rooms Schema
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

// ENHANCED Community Message Schema - WITH REPLY SUPPORT
const messageSchema = new mongoose.Schema({
  // Legacy fields (keep for backward compatibility)
  room: String,
  username: String,
  userId: String,
  message: String,
  timestamp: { type: Date, default: Date.now },
  // Enhanced fields for room support
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
  content: String,
  avatar: { type: String, default: 'U' },
  avatarColor: { type: String, default: '#6366f1' },
  // NEW: Reply functionality fields
  replyTo: {
    messageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
    userId: String,
    username: String,
    content: String
  },
  // NEW: Deletion fields
  deleted: { type: Boolean, default: false },
  deletedAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

const Message = mongoose.model('Message', messageSchema);

// Life Goals Schema
const lifeGoalSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  area: { type: String, enum: ['mind', 'spirit', 'body', 'work', 'relationships', 'fun', 'finances'], required: true },
  bigGoal: { type: String, required: true },
  dailyAction: { type: String, required: true },
  completed: { type: Boolean, default: false },
  streak: { type: Number, default: 0 },
  lastCompletedDate: { type: Date },
  completionHistory: [{ 
    date: { type: Date, required: true },
    completed: { type: Boolean, required: true }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const LifeGoal = mongoose.model('LifeGoal', lifeGoalSchema);

// Daily Emotions Schema - NEW
const dailyEmotionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  emotion: { 
    type: String, 
    enum: ['happy', 'excited', 'content', 'hopeful', 'sad', 'angry', 'disappointed', 'lonely', 'scared', 'stressed'], 
    required: true 
  },
  intensity: { type: Number, min: 1, max: 5, default: 3 }, // Optional intensity rating
  notes: { type: String, maxlength: 500 }, // Optional notes
  date: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Ensure one emotion per user per day
dailyEmotionSchema.index({ userId: 1, date: 1 }, { unique: true });

const DailyEmotion = mongoose.model('DailyEmotion', dailyEmotionSchema);

// Insights Schema - NEW
const insightSchema = new mongoose.Schema({

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
  res.json({ message: 'Enhanced reply system deployed!', timestamp: new Date() });
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
// GOALS API ROUTES
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
// ENHANCED NOTIFICATIONS API ROUTES
// ==========================================

app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const { type, limit = 50 } = req.query;
    
    let query = { userId: req.user.userId };
    if (type && type !== 'all') {
      query.type = type;
    }
    
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));
    
    res.json(notifications);
  } catch (error) {
    console.error('Get notifications error:', error);
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

// ENHANCED: Notifications unread count with reply support
app.get('/api/notifications/unread-count', authenticateToken, async (req, res) => {
  try {
    const totalCount = await Notification.countDocuments({ 
      userId: req.user.userId, 
      read: false 
    });
    
    const replyCount = await Notification.countDocuments({ 
      userId: req.user.userId, 
      read: false,
      type: 'community',
      title: { $regex: 'replied', $options: 'i' }
    });
    
    res.json({ 
      count: totalCount,
      replyCount: replyCount,
      hasReplies: replyCount > 0
    });
  } catch (error) {
    console.error('Unread count error:', error);
    res.json({ count: 0, replyCount: 0, hasReplies: false });
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
// ENHANCED CHAT ROOMS API ROUTES
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

// ENHANCED: Get messages with reply support and deleted message handling
app.get('/api/rooms/:id/messages', authenticateToken, async (req, res) => {
  try {
    const messages = await Message.find({ roomId: req.params.id })
      .sort({ createdAt: 1 })
      .limit(100);
      
    console.log(`📨 Retrieved ${messages.length} messages for room ${req.params.id}`);
    
    // Process messages to ensure proper reply structure and handle deleted messages
    const processedMessages = messages.map(message => {
      const messageObj = message.toObject();
      
      // Ensure backward compatibility
      if (!messageObj.content && messageObj.message) {
        messageObj.content = messageObj.message;
      }
      
      // Handle deleted messages
      if (messageObj.deleted) {
        messageObj.content = '[Message deleted by user]';
        messageObj.message = '[Message deleted by user]';
        messageObj.isDeleted = true;
        // Keep username for threading but mark as deleted
        if (!messageObj.username.includes('(deleted)')) {
          messageObj.username = messageObj.username + ' (deleted)';
        }
      }
      
      return messageObj;
    });
    
    res.json(processedMessages);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// ENHANCED: Send message with reply notifications
app.post('/api/rooms/:id/messages', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    const username = user ? `${user.firstName} ${user.lastName}` : 'User';
    
    // Create the message
    const messageData = {
      roomId: req.params.id,
      userId: req.user.userId,
      username: username,
      avatar: req.body.avatar || user?.firstName?.charAt(0).toUpperCase() || 'U',
      content: req.body.content,
      message: req.body.content, // For compatibility
      avatarColor: req.body.avatarColor || '#6366f1'
    };

    // Handle reply data if this is a reply
    if (req.body.replyTo) {
      messageData.replyTo = {
        messageId: req.body.replyTo.messageId,
        userId: req.body.replyTo.userId || 'unknown',
        username: req.body.replyTo.username,
        content: req.body.replyTo.content
      };

      console.log('💬 Creating reply message:', {
        replyingTo: req.body.replyTo.username,
        from: username,
        content: req.body.content.substring(0, 50) + '...'
      });

      // CREATE NOTIFICATION for the person being replied to
      try {
        // Find the user being replied to
        const repliedToUser = await User.findOne({
          $or: [
            { _id: req.body.replyTo.userId }, // Try by ID first
            { 
              $expr: {
                $eq: [
                  { $concat: ['$firstName', ' ', '$lastName'] },
                  req.body.replyTo.username
                ]
              }
            } // Fallback to name matching
          ]
        });

        if (repliedToUser && repliedToUser._id.toString() !== req.user.userId) {
          // Don't notify yourself
          const notification = new Notification({
            userId: repliedToUser._id,
            type: 'community',
            title: `💬 ${username} replied to your message`,
            content: `"${req.body.content.length > 100 ? req.body.content.substring(0, 100) + '...' : req.body.content}"`,
            isReply: true, // Mark as reply notification
            priority: 'high', // High priority for replies
            createdAt: new Date()
          });

          await notification.save();
          
          console.log('🔔 Reply notification created for:', repliedToUser.email);
        } else if (!repliedToUser) {
          console.log('⚠️ Could not find user to notify for reply:', req.body.replyTo.username);
        } else {
          console.log('ℹ️ Skipping self-notification for reply');
        }
      } catch (notificationError) {
        console.error('❌ Error creating reply notification:', notificationError);
        // Don't fail the message send if notification fails
      }
    }

    const message = new Message(messageData);
    await message.save();
    
    console.log('✅ Message saved successfully:', {
      id: message._id,
      isReply: !!message.replyTo,
      room: req.params.id
    });
    
    res.json(message);
  } catch (error) {
    console.error('❌ Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// ENHANCED: Delete message endpoint - WORKING VERSION
app.delete('/api/messages/:id', authenticateToken, async (req, res) => {
  try {
    const messageId = req.params.id;
    const userId = req.user.userId;
    
    console.log('🗑️ DELETE REQUEST:', { messageId, userId, timestamp: new Date().toISOString() });
    
    // Validate messageId format
    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      console.log('❌ Invalid message ID format');
      return res.status(400).json({ 
        success: false,
        message: 'Invalid message ID format' 
      });
    }
    
    // Find the message
    const message = await Message.findById(messageId);
    
    if (!message) {
      console.log('❌ Message not found:', messageId);
      return res.status(404).json({ 
        success: false,
        message: 'Message not found' 
      });
    }
    
    console.log('📝 Found message:', {
      id: message._id,
      owner: message.userId,
      requester: userId,
      content: message.content?.substring(0, 30) + '...'
    });
    
    // Check if the user owns this message
    if (message.userId !== userId) {
      console.log('❌ Permission denied. Message owner:', message.userId, 'Requester:', userId);
      return res.status(403).json({ 
        success: false,
        message: 'You can only delete your own messages' 
      });
    }
    
    // Check if this message has replies
    const repliesCount = await Message.countDocuments({
      'replyTo.messageId': messageId
    });
    
    console.log(`📊 Message has ${repliesCount} replies`);
    
    if (repliesCount > 0) {
      console.log(`⚠️ Message has ${repliesCount} replies. Converting to deleted placeholder.`);
      
      // Instead of deleting, convert to a placeholder
      message.content = '[Message deleted by user]';
      message.message = '[Message deleted by user]'; // For backward compatibility
      message.deleted = true;
      message.deletedAt = new Date();
      // Keep username for threading but mark as deleted
      if (!message.username.includes('(deleted)')) {
        message.username = message.username + ' (deleted)';
      }
      
      await message.save();
      
      console.log('✅ Message converted to placeholder due to replies');
      
      return res.json({ 
        success: true,
        message: 'Message deleted (converted to placeholder due to replies)',
        hasReplies: true,
        messageId: messageId
      });
    } else {
      // No replies - safe to completely delete
      await Message.findByIdAndDelete(messageId);
      
      console.log('✅ Message completely deleted from database');
      
      return res.json({ 
        success: true,
        message: 'Message permanently deleted',
        hasReplies: false,
        messageId: messageId
      });
    }
    
  } catch (error) {
    console.error('❌ Error deleting message:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid message ID format' 
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Failed to delete message',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
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
    
    // Delete related notifications
    await Notification.deleteMany({ 
      type: 'community',
      title: { $regex: room.name, $options: 'i' }
    });
    
    // Delete the room
    await Room.findByIdAndDelete(req.params.id);
    
    console.log(`🗑️ Room "${room.name}" and related data deleted`);
    
    res.json({ message: 'Room deleted successfully' });
  } catch (error) {
    console.error('❌ Delete room error:', error);
    res.status(500).json({ error: 'Failed to delete room' });
  }
});

// ==========================================
// LIFE GOALS API ROUTES
// ==========================================

// Get all life goals for a user
app.get('/api/life-goals', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const goals = await LifeGoal.find({ userId }).sort({ createdAt: -1 });
    res.json(goals);
  } catch (error) {
    console.error('Get life goals error:', error);
    res.status(500).json({ error: 'Failed to fetch life goals' });
  }
});

// Create a new life goal
app.post('/api/life-goals', authenticateToken, async (req, res) => {
  try {
    const { area, bigGoal, dailyAction } = req.body;
    const userId = req.user.userId;

    if (!area || !bigGoal || !dailyAction) {
      return res.status(400).json({ error: 'Area, big goal, and daily action are required' });
    }

    const validAreas = ['mind', 'spirit', 'body', 'work', 'relationships', 'fun', 'finances'];
    if (!validAreas.includes(area)) {
      return res.status(400).json({ error: 'Invalid area specified' });
    }

    const lifeGoal = new LifeGoal({
      userId,
      area,
      bigGoal,
      dailyAction,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await lifeGoal.save();

    // Create a notification for the user
    try {
      const notification = new Notification({
        userId,
        type: 'system',
        title: `New ${area.charAt(0).toUpperCase() + area.slice(1)} Goal Created!`,
        content: `You've set a new goal: "${dailyAction}". Start tracking your daily progress!`,
        createdAt: new Date()
      });
      await notification.save();
    } catch (notifError) {
      console.error('Error creating notification:', notifError);
    }

    res.status(201).json(lifeGoal);
  } catch (error) {
    console.error('Create life goal error:', error);
    res.status(500).json({ error: 'Failed to create life goal' });
  }
});

app.put('/api/life-goals/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { bigGoal, dailyAction, completed, lastCompletedDate } = req.body;
    const userId = req.user.userId;

    const goal = await LifeGoal.findOne({ _id: id, userId });
    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    if (bigGoal !== undefined) goal.bigGoal = bigGoal;
    if (dailyAction !== undefined) goal.dailyAction = dailyAction;
    
    if (completed !== undefined) {
      goal.completed = completed;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (!goal.completionHistory) {
        goal.completionHistory = [];
      }
      
      const existingTodayIndex = goal.completionHistory.findIndex(entry => {
        const entryDate = new Date(entry.date);
        entryDate.setHours(0, 0, 0, 0);
        return entryDate.getTime() === today.getTime();
      });
      
      if (completed && lastCompletedDate) {
        goal.lastCompletedDate = new Date(lastCompletedDate);
        
        if (existingTodayIndex >= 0) {
          goal.completionHistory[existingTodayIndex].completed = true;
        } else {
          goal.completionHistory.push({
            date: today,
            completed: true
          });
        }
        
        const sortedHistory = goal.completionHistory
          .filter(entry => entry.completed)
          .sort((a, b) => new Date(b.date) - new Date(a.date));
        
        let currentStreak = 0;
        const oneDay = 24 * 60 * 60 * 1000;
        
        for (let i = 0; i < sortedHistory.length; i++) {
          const entryDate = new Date(sortedHistory[i].date);
          entryDate.setHours(0, 0, 0, 0);
          
          if (i === 0) {
            if (entryDate.getTime() === today.getTime()) {
              currentStreak = 1;
            } else {
              break;
            }
          } else {
            const prevDate = new Date(sortedHistory[i-1].date);
            prevDate.setHours(0, 0, 0, 0);
            const daysDiff = (prevDate.getTime() - entryDate.getTime()) / oneDay;
            
            if (daysDiff === 1) {
              currentStreak++;
            } else {
              break;
            }
          }
        }
        
        goal.streak = currentStreak;
        
      } else if (!completed) {
        goal.lastCompletedDate = null;
        
        if (existingTodayIndex >= 0) {
          goal.completionHistory[existingTodayIndex].completed = false;
        } else {
          goal.completionHistory.push({
            date: today,
            completed: false
          });
        }
        
        const sortedCompletedHistory = goal.completionHistory
          .filter(entry => entry.completed && new Date(entry.date).getTime() !== today.getTime())
          .sort((a, b) => new Date(b.date) - new Date(a.date));
        
        if (sortedCompletedHistory.length === 0) {
          goal.streak = 0;
        } else {
          let streak = 0;
          const oneDay = 24 * 60 * 60 * 1000;
          const yesterday = new Date(today.getTime() - oneDay);
          
          for (let i = 0; i < sortedCompletedHistory.length; i++) {
            const entryDate = new Date(sortedCompletedHistory[i].date);
            entryDate.setHours(0, 0, 0, 0);
            
            if (i === 0) {
              if (entryDate.getTime() === yesterday.getTime()) {
                streak = 1;
              } else {
                break;
              }
            } else {
              const prevDate = new Date(sortedCompletedHistory[i-1].date);
              prevDate.setHours(0, 0, 0, 0);
              const daysDiff = (prevDate.getTime() - entryDate.getTime()) / oneDay;
              
              if (daysDiff === 1) {
                streak++;
              } else {
                break;
              }
            }
          }
          
          goal.streak = streak;
        }
      }
    }
    
    goal.updatedAt = new Date();
    await goal.save();

    res.json(goal);
  } catch (error) {
    console.error('Update life goal error:', error);
    res.status(500).json({ error: 'Failed to update life goal' });
  }
});

app.delete('/api/life-goals/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const goal = await LifeGoal.findOneAndDelete({ _id: id, userId });
    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    res.json({ message: 'Goal deleted successfully' });
  } catch (error) {
    console.error('Delete life goal error:', error);
    res.status(500).json({ error: 'Failed to delete goal' });
  }
});

app.post('/api/life-goals/:id/track', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { completed } = req.body;
    const userId = req.user.userId;

    const goal = await LifeGoal.findOne({ _id: id, userId });
    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastCompleted = goal.lastCompletedDate ? new Date(goal.lastCompletedDate) : null;
    
    if (lastCompleted) {
      lastCompleted.setHours(0, 0, 0, 0);
      if (today.getTime() === lastCompleted.getTime()) {
        return res.status(400).json({ error: 'Already tracked for today' });
      }
    }

    goal.completed = completed;
    goal.lastCompletedDate = new Date();
    
    if (completed) {
      goal.streak += 1;
    } else {
      goal.streak = Math.max(0, goal.streak - 1);
    }
    
    goal.updatedAt = new Date();
    await goal.save();

    res.json({
      message: 'Progress tracked successfully',
      streak: goal.streak,
      completed: goal.completed
    });
  } catch (error) {
    console.error('Track goal error:', error);
    res.status(500).json({ error: 'Failed to track progress' });
  }
});

app.get('/api/life-goals/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const totalGoals = await LifeGoal.countDocuments({ userId });
    const completedToday = await LifeGoal.countDocuments({ 
      userId, 
      lastCompletedDate: { 
        $gte: new Date(new Date().setHours(0, 0, 0, 0)),
        $lt: new Date(new Date().setHours(23, 59, 59, 999))
      }
    });
    
    const activeStreaks = await LifeGoal.find({ userId, streak: { $gt: 0 } });
    const longestStreak = activeStreaks.length > 0 ? Math.max(...activeStreaks.map(g => g.streak)) : 0;
    
    const goalsByArea = await LifeGoal.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      { $group: { _id: '$area', count: { $sum: 1 } } }
    ]);
    
    res.json({
      totalGoals,
      completedToday,
      longestStreak,
      goalsByArea: goalsByArea.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {})
    });
  } catch (error) {
    console.error('Get goal stats error:', error);
    res.status(500).json({ error: 'Failed to fetch goal statistics' });
  }
});

// Migration function
async function migrateGoalsToHistory() {
  try {
    console.log('🔄 Starting goal history migration...');
    
    const goalsToMigrate = await LifeGoal.find({ 
      completionHistory: { $exists: false } 
    });
    
    console.log(`📊 Found ${goalsToMigrate.length} goals to migrate`);
    
    for (const goal of goalsToMigrate) {
      goal.completionHistory = [];
      
      if (goal.lastCompletedDate) {
        goal.completionHistory.push({
          date: goal.lastCompletedDate,
          completed: true
        });
      }
      
      await goal.save();
    }
    
    console.log('✅ Goal history migration completed');
  } catch (error) {
    console.error('❌ Migration error:', error);
  }
}

// ==========================================
// EMOTION TRACKER API ROUTES - NEW
// ==========================================

// Get user's emotion history
app.get('/api/emotions', authenticateToken, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    
    const emotions = await DailyEmotion.find({
      userId: req.user.userId,
      date: { $gte: startDate }
    }).sort({ date: -1 });
    
    res.json(emotions);
  } catch (error) {
    console.error('Get emotions error:', error);
    res.status(500).json({ error: 'Failed to fetch emotions' });
  }
});

// Record today's emotion
app.post('/api/emotions', authenticateToken, async (req, res) => {
  try {
    const { emotion, intensity, notes } = req.body;
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to midnight for consistent daily tracking
    
    // Validate emotion
    const validEmotions = ['happy', 'excited', 'content', 'hopeful', 'sad', 'angry', 'disappointed', 'lonely', 'scared', 'stressed'];
    if (!validEmotions.includes(emotion)) {
      return res.status(400).json({ error: 'Invalid emotion' });
    }
    
    // Update or create today's emotion entry
    const emotionEntry = await DailyEmotion.findOneAndUpdate(
      { 
        userId: req.user.userId, 
        date: today 
      },
      { 
        emotion, 
        intensity: intensity || 3,
        notes: notes || '',
        updatedAt: new Date()
      },
      { 
        upsert: true, 
        new: true 
      }
    );
    
    console.log('🎭 Emotion recorded:', { userId: req.user.userId, emotion, date: today });
    res.json(emotionEntry);
    
  } catch (error) {
    console.error('Record emotion error:', error);
    if (error.code === 11000) {
      res.status(400).json({ error: 'Emotion already recorded for today' });
    } else {
      res.status(500).json({ error: 'Failed to record emotion' });
    }
  }
});

// Get today's emotion
app.get('/api/emotions/today', authenticateToken, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todaysEmotion = await DailyEmotion.findOne({
      userId: req.user.userId,
      date: today
    });
    
    res.json(todaysEmotion);
  } catch (error) {
    console.error('Get today emotion error:', error);
    res.status(500).json({ error: 'Failed to fetch today\'s emotion' });
  }
});

// Delete emotion entry
app.delete('/api/emotions/:id', authenticateToken, async (req, res) => {
  try {
    await DailyEmotion.findOneAndDelete({ 
      _id: req.params.id, 
      userId: req.user.userId 
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete emotion error:', error);
    res.status(500).json({ error: 'Failed to delete emotion' });
  }
});

// Get emotion statistics
app.get('/api/emotions/stats', authenticateToken, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    
    const emotions = await DailyEmotion.find({
      userId: req.user.userId,
      date: { $gte: startDate }
    });
    
    // Calculate statistics
    const stats = {
      totalEntries: emotions.length,
      averageIntensity: emotions.length > 0 ? 
        emotions.reduce((sum, e) => sum + e.intensity, 0) / emotions.length : 0,
      emotionCounts: {},
      weeklyPattern: {}
    };
    
    // Count emotions
    emotions.forEach(emotion => {
      stats.emotionCounts[emotion.emotion] = (stats.emotionCounts[emotion.emotion] || 0) + 1;
    });
    
    res.json(stats);
  } catch (error) {
    console.error('Get emotion stats error:', error);
    res.status(500).json({ error: 'Failed to fetch emotion statistics' });
  }
});

// Enhanced health check with reply system status + SETTINGS
app.get('/health', (req, res) => {

// Enhanced health check with reply system status
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      openai: openai ? 'available' : 'unavailable',
      stripe: process.env.STRIPE_SECRET_KEY ? 'configured' : 'not configured',
      email: transporter ? 'configured' : 'not configured'
    },
    features: {
      replySystem: 'enabled',
      replyNotifications: 'enabled',
      communityRooms: 'enabled',
      lifeGoals: 'enabled',
      messageDeleting: 'enabled'
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
  migrateGoalsToHistory();
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔑 JWT Secret: ${process.env.JWT_SECRET ? 'configured' : 'using default'}`);
  console.log(`🤖 OpenAI Assistant: ${openai ? 'ready (asst_tpShoq1kPGvtcFhMdxb6EmYg)' : 'disabled'}`);
  console.log(`💳 Stripe: ${process.env.STRIPE_SECRET_KEY ? 'ready' : 'not configured'}`);
  console.log(`📧 Email: ${transporter ? 'ready' : 'not configured'}`);
  console.log(`💾 Database Storage: Goals ✅ Notifications ✅ Chat Rooms ✅ Life Goals ✅`);
  console.log(`💬 Enhanced Reply System: ENABLED with Notifications ✅`);
  console.log(`🗑️ Message Deletion: ENABLED with Permanent Server Deletion ✅`);
});
