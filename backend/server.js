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
const cron = require('node-cron');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors()); // Allow all origins for testing

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

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
  company: { type: String, default: '' },              // NEW: Store company name
  timezone: { type: String, default: 'America/Chicago' }, // NEW: Store timezone
profilePhoto: { type: String },
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
    profilePhoto: { type: String }, // NEW: Store user profile photos
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

// Daily Prompt Schema
const dailyPromptSchema = new mongoose.Schema({
  prompt: { type: String, required: true },
  category: { type: String, enum: ['reflection', 'goal-setting', 'mindfulness', 'leadership', 'growth', 'gratitude', 'challenge'], default: 'reflection' },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  tags: [String],
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  usageCount: { type: Number, default: 0 },
  lastUsed: { type: Date }
});

const DailyPrompt = mongoose.model('DailyPrompt', dailyPromptSchema);

// Daily Prompt Response Schema
const dailyPromptResponseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  promptId: { type: mongoose.Schema.Types.ObjectId, ref: 'DailyPrompt', required: true },
  response: { type: String, required: true },
 mood: { type: String, enum: ['sad', 'angry', 'disappointed', 'happy', 'numb', 'lonely', 'hopeful', 'excited', 'content', 'afraid'], default: 'content' },
  wordCount: { type: Number },
  timeToComplete: { type: Number },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const DailyPromptResponse = mongoose.model('DailyPromptResponse', dailyPromptResponseSchema);

// Daily Prompt Assignment Schema
const dailyPromptAssignmentSchema = new mongoose.Schema({
  date: { type: Date, required: true, unique: true },
  promptId: { type: mongoose.Schema.Types.ObjectId, ref: 'DailyPrompt', required: true },
  responseCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

const DailyPromptAssignment = mongoose.model('DailyPromptAssignment', dailyPromptAssignmentSchema);

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

// Insights Schema - NEW
const insightSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['stress', 'communication', 'productivity', 'emotional', 'leadership'], required: true },
  insight: { type: String, required: true },
  confidence: { type: Number, min: 0, max: 1, default: 0.7 },
  source: { type: String, enum: ['ai_analysis', 'pattern_detection', 'user_feedback'] },
  chatSession: { type: String },
  createdAt: { type: Date, default: Date.now },
  isRead: { type: Boolean, default: false }
});

const Insight = mongoose.model('Insight', insightSchema);

// Generate insights from chat conversations - NEW
async function generateInsights(userId, messages) {
  try {
    if (!openai || messages.length < 6) return; // Need enough conversation
    
    console.log('🧠 Generating insights for user:', userId);
    
    // Get recent user messages for analysis
    const userMessages = messages
      .filter(msg => msg.role === 'user')
      .slice(-8) // Last 8 user messages
      .map(msg => msg.content)
      .join('\n');
    
    if (userMessages.length < 50) return; // Need substantial content
    
    // Use OpenAI to analyze patterns
    const analysisPrompt = `Analyze these entrepreneur conversation messages and identify 1-2 actionable insights about their stress patterns, communication style, productivity, emotional state, or leadership challenges.

Messages:
${userMessages}

Format response as:
TYPE: specific actionable insight under 80 characters

Types: stress, communication, productivity, emotional, leadership
Be specific and actionable, not generic.`;
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: analysisPrompt }],
      max_tokens: 200,
      temperature: 0.3
    });
    
    const analysisResult = completion.choices[0].message.content;
    console.log('🔍 AI Analysis Result:', analysisResult);
    
    // Parse insights from AI response
    const insightLines = analysisResult.split('\n').filter(line => line.includes(':'));
    
    for (const line of insightLines) {
      const parts = line.split(':');
      if (parts.length >= 2) {
        const type = parts[0].trim().toLowerCase();
        const insight = parts.slice(1).join(':').trim();
        
        if (insight && insight.length > 15) {
          // Check if similar insight already exists
          const existingInsight = await Insight.findOne({
            userId,
            type,
            insight: { $regex: insight.substring(0, 15), $options: 'i' },
            createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
          });
          
          if (!existingInsight) {
            const newInsight = new Insight({
              userId,
              type: ['stress', 'communication', 'productivity', 'emotional', 'leadership'].includes(type) ? type : 'emotional',
              insight: insight.charAt(0).toUpperCase() + insight.slice(1),
              source: 'ai_analysis',
              confidence: 0.8
            });
            
            await newInsight.save();
            console.log('💡 Generated insight:', newInsight.insight);
          }
        }
      }
    }
    
  } catch (error) {
    console.error('Error generating insights:', error);
  }
}

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

// Helper function to get next prompt
async function getNextPrompt() {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const availablePrompts = await DailyPrompt.find({
      isActive: true,
      $or: [
        { lastUsed: { $lt: thirtyDaysAgo } },
        { lastUsed: { $exists: false } }
      ]
    }).sort({ usageCount: 1, lastUsed: 1 });

    if (availablePrompts.length === 0) {
      const fallbackPrompt = await DailyPrompt.findOne({ isActive: true })
        .sort({ lastUsed: 1 });
      return fallbackPrompt;
    }

    const randomIndex = Math.floor(Math.random() * availablePrompts.length);
    return availablePrompts[randomIndex];

  } catch (error) {
    console.error('Error getting next prompt:', error);
    return null;
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

// Generate insights after successful chat - NEW
    if (chat && chat.messages.length >= 6 && chat.messages.length % 4 === 0) {
      setTimeout(() => generateInsights(userId, chat.messages), 3000);
    }

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
        createdAt: user.createdAt,
        company: user.company,
        timezone: user.timezone,
        profilePhoto: user.profilePhoto
      }
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ message: 'Failed to get profile' });
  }
});

// Update user profile
app.put('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { firstName, lastName, email, company, timezone } = req.body;
    
    if (!firstName || !lastName || !email) {
      return res.status(400).json({ error: 'First name, last name, and email are required' });
    }
    
    const existingUser = await User.findOne({ 
      email: email.toLowerCase(), 
      _id: { $ne: userId } 
    });
    
    if (existingUser) {
      return res.status(400).json({ error: 'Email is already in use by another account' });
    }
    
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.toLowerCase().trim(),
        company: company?.trim() || '',
        timezone: timezone || 'America/Chicago'
      },
      { new: true }
    ).select('-password');
    
    res.json({
      message: 'Profile updated successfully',
      profile: {
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        company: updatedUser.company,
        timezone: updatedUser.timezone
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// REPLACE the existing createDailyPromptNotification function with this fixed version
async function createDailyPromptNotification() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    console.log(`🌅 Creating daily prompt for ${today.toISOString().split('T')[0]}`);

    // STEP 1: ALWAYS create/update today's assignment with a fresh prompt
    // Delete any existing assignment for today first
    await DailyPromptAssignment.deleteOne({ date: today });
    console.log('🗑️ Cleared existing assignment for today');

    // Get a fresh prompt
    const nextPrompt = await getNextPrompt();
    if (!nextPrompt) {
      console.log('⚠️ No prompts available for assignment');
      return;
    }

    // Create new assignment with fresh prompt
    const assignment = new DailyPromptAssignment({
      date: today,
      promptId: nextPrompt._id,
      responseCount: 0
    });
    
    await assignment.save();
    console.log(`✅ Created fresh daily prompt assignment: "${nextPrompt.prompt.substring(0, 50)}..."`);

    // Update prompt usage stats
    nextPrompt.usageCount += 1;
    nextPrompt.lastUsed = new Date();
    await nextPrompt.save();

    // STEP 2: Send notifications (only if not already sent today)
    const existingNotifications = await Notification.countDocuments({
      type: 'system',
      title: { $regex: 'Daily Prompt Available', $options: 'i' },
      createdAt: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      }
    });

    if (existingNotifications > 0) {
      console.log('📅 Daily prompt notifications already sent today, skipping notifications');
      return;
    }

    // Send notifications to active users
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const activeUsers = await User.find({
      'streakData.lastLoginDate': { $gte: thirtyDaysAgo }
    });

    console.log(`📨 Creating daily prompt notifications for ${activeUsers.length} active users`);

    const notifications = activeUsers.map(user => ({
      userId: user._id,
      type: 'system',
      title: '🌅 Daily Prompt Available!',
      content: `Today's reflection: "${nextPrompt.prompt.substring(0, 100)}${nextPrompt.prompt.length > 100 ? '...' : ''}"`,
      priority: 'normal',
      createdAt: new Date()
    }));

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
      console.log(`✅ Created ${notifications.length} daily prompt notifications`);
    }

  } catch (error) {
    console.error('❌ Error creating daily prompt notifications:', error);
  }
}

// Manual trigger endpoint for testing
app.post('/api/admin/daily-prompt-tasks', authenticateToken, async (req, res) => {
  try {
    await createDailyPromptNotification();
    res.json({ message: 'Daily prompt notifications sent successfully' });
  } catch (error) {
    console.error('Error running daily tasks:', error);
    res.status(500).json({ error: 'Failed to run daily tasks' });
  }
});

// Manual endpoint to force new prompt
app.post('/api/admin/force-new-prompt', authenticateToken, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Delete existing assignment for today
    await DailyPromptAssignment.deleteOne({ date: today });
    console.log('🗑️ Deleted existing assignment for today');
    
    // Get next prompt
    const nextPrompt = await getNextPrompt();
    if (!nextPrompt) {
      return res.status(404).json({ error: 'No prompts available' });
    }

    // Create new assignment
    const assignment = new DailyPromptAssignment({
      date: today,
      promptId: nextPrompt._id,
      responseCount: 0
    });
    
    await assignment.save();
    
    // Update prompt usage
    nextPrompt.usageCount += 1;
    nextPrompt.lastUsed = new Date();
    await nextPrompt.save();
    
    res.json({ 
      message: 'New prompt assignment created successfully',
      prompt: nextPrompt.prompt,
      date: assignment.date
    });
  } catch (error) {
    console.error('Force new prompt error:', error);
    res.status(500).json({ error: 'Failed to force new prompt' });
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
      content: message,
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

app.get('/api/rooms/:id/messages', authenticateToken, async (req, res) => {
  try {
    const messages = await Message.find({ roomId: req.params.id })
      .sort({ createdAt: 1 })
      .limit(100);
      
    console.log(`📨 Retrieved ${messages.length} messages for room ${req.params.id}`);
    
    const processedMessages = await Promise.all(messages.map(async (message) => {
      const messageObj = message.toObject();
      
      if (!messageObj.content && messageObj.message) {
        messageObj.content = messageObj.message;
      }
      
      if (messageObj.deleted) {
        messageObj.content = '[Message deleted by user]';
        messageObj.message = '[Message deleted by user]';
        messageObj.isDeleted = true;
        if (!messageObj.username.includes('(deleted)')) {
          messageObj.username = messageObj.username + ' (deleted)';
        }
      }
      
      if (!messageObj.profilePhoto && messageObj.userId) {
        try {
          const user = await User.findById(messageObj.userId).select('profilePhoto');
          if (user && user.profilePhoto) {
            messageObj.profilePhoto = user.profilePhoto;
          }
        } catch (error) {
          console.log('⚠️ Could not populate profile photo for user:', messageObj.userId);
        }
      }
      
      return messageObj;
    }));
    
    res.json(processedMessages);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

app.post('/api/rooms/:id/messages', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    const username = user ? `${user.firstName} ${user.lastName}` : 'User';
    
    const messageData = {
      roomId: req.params.id,
      userId: req.user.userId,
      username: username,
      avatar: req.body.avatar || user?.firstName?.charAt(0).toUpperCase() || 'U',
      content: req.body.content,
      message: req.body.content,
      avatarColor: req.body.avatarColor || '#6366f1',
      profilePhoto: user?.profilePhoto || null
    };

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

      try {
        const repliedToUser = await User.findOne({
          $or: [
            { _id: req.body.replyTo.userId },
            { 
              $expr: {
                $eq: [
                  { $concat: ['$firstName', ' ', '$lastName'] },
                  req.body.replyTo.username
                ]
              }
            }
          ]
        });

        if (repliedToUser && repliedToUser._id.toString() !== req.user.userId) {
          const notification = new Notification({
            userId: repliedToUser._id,
            type: 'community',
            title: `💬 ${username} replied to your message`,
            content: `"${req.body.content.length > 100 ? req.body.content.substring(0, 100) + '...' : req.body.content}"`,
            isReply: true,
            priority: 'high',
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

app.delete('/api/messages/:id', authenticateToken, async (req, res) => {
  try {
    const messageId = req.params.id;
    const userId = req.user.userId;
    
    console.log('🗑️ DELETE REQUEST:', { messageId, userId, timestamp: new Date().toISOString() });
    
    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      console.log('❌ Invalid message ID format');
      return res.status(400).json({ 
        success: false,
        message: 'Invalid message ID format' 
      });
    }
    
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
    
    if (message.userId !== userId) {
      console.log('❌ Permission denied. Message owner:', message.userId, 'Requester:', userId);
      return res.status(403).json({ 
        success: false,
        message: 'You can only delete your own messages' 
      });
    }
    
    const repliesCount = await Message.countDocuments({
      'replyTo.messageId': messageId
    });
    
    console.log(`📊 Message has ${repliesCount} replies`);
    
    if (repliesCount > 0) {
      console.log(`⚠️ Message has ${repliesCount} replies. Converting to deleted placeholder.`);
      
      message.content = '[Message deleted by user]';
      message.message = '[Message deleted by user]';
      message.deleted = true;
      message.deletedAt = new Date();
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
    
    await Message.deleteMany({ roomId: req.params.id });
    
    await Notification.deleteMany({ 
      type: 'community',
      title: { $regex: room.name, $options: 'i' }
    });
    
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

if (completed !== undefined) {
  // STRICT SERVER FIX: Only update today's completion, nothing else
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayDateString = today.toISOString().split('T')[0];
  
  console.log(`🔧 SERVER FIX - Updating goal ${id} for ONLY ${todayDateString}: ${completed}`);
  
  // Update basic completion status
  goal.completed = completed;
  
  // Update lastCompletedDate only if completing today
  if (completed) {
    goal.lastCompletedDate = today;
  } else {
    // Only clear lastCompletedDate if it was set to today
    if (goal.lastCompletedDate) {
      const lastDate = new Date(goal.lastCompletedDate);
      lastDate.setHours(0, 0, 0, 0);
      const lastDateString = lastDate.toISOString().split('T')[0];
      if (lastDateString === todayDateString) {
        goal.lastCompletedDate = null;
      }
    }
  }
  
  // Initialize completion history if it doesn't exist
  if (!goal.completionHistory) {
    goal.completionHistory = [];
  }
  
  // Find or create today's entry ONLY
  const todayEntryIndex = goal.completionHistory.findIndex(entry => {
    if (!entry.date) return false;
    const entryDate = new Date(entry.date);
    const entryDateString = entryDate.toISOString().split('T')[0];
    return entryDateString === todayDateString;
  });
  
  if (todayEntryIndex >= 0) {
    // Update existing today's entry
    goal.completionHistory[todayEntryIndex].completed = completed;
    console.log(`🔧 SERVER FIX - Updated existing entry for ${todayDateString}`);
  } else {
    // Create new entry for today only
    goal.completionHistory.push({
      date: today,
      completed: completed
    });
    console.log(`🔧 SERVER FIX - Created new entry for ${todayDateString}`);
  }
  
  // Recalculate streak based on completion history
  const sortedHistory = goal.completionHistory
    .filter(entry => entry.completed === true)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  
  let currentStreak = 0;
  const oneDay = 24 * 60 * 60 * 1000;
  
  for (let i = 0; i < sortedHistory.length; i++) {
    const entryDate = new Date(sortedHistory[i].date);
    entryDate.setHours(0, 0, 0, 0);
    
    if (i === 0) {
      // Check if most recent completion is today or yesterday
      const yesterday = new Date(today.getTime() - oneDay);
      if (entryDate.getTime() === today.getTime() || entryDate.getTime() === yesterday.getTime()) {
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
  console.log(`🔧 SERVER FIX - Recalculated streak: ${currentStreak}`);
}
    
    goal.updatedAt = new Date();
    
    // FIXED: Only save THIS specific goal
    await goal.save();

    console.log(`✅ FIXED - Goal ${id} updated for date ${updateDate || 'today'} only`);
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
// INSIGHTS API ROUTES
// ==========================================

app.get('/api/insights', authenticateToken, async (req, res) => {
  try {
    const { limit = 5, type } = req.query;
    
    let query = { userId: req.user.userId };
    if (type && type !== 'all') {
      query.type = type;
    }
    
    const insights = await Insight.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));
    
    res.json(insights);
  } catch (error) {
    console.error('Get insights error:', error);
    res.status(500).json({ error: 'Failed to fetch insights' });
  }
});

app.put('/api/insights/:id/read', authenticateToken, async (req, res) => {
  try {
    await Insight.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      { isRead: true }
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Mark insight read error:', error);
    res.status(500).json({ error: 'Failed to mark insight as read' });
  }
});

app.delete('/api/insights/:id', authenticateToken, async (req, res) => {
  try {
    await Insight.findOneAndDelete({ _id: req.params.id, userId: req.user.userId });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete insight error:', error);
    res.status(500).json({ error: 'Failed to delete insight' });
  }
});

// ==========================================
// SETTINGS API ROUTES
// ==========================================

app.get('/api/user/settings', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({
      profile: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        company: user.company || '',
        timezone: user.timezone || 'America/Chicago',
        profilePhoto: user.profilePhoto || null
      }
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ message: 'Failed to get settings' });
  }
});

app.put('/api/user/change-password', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }
    
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    
    await User.findByIdAndUpdate(userId, {
      password: hashedNewPassword
    });
    
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

app.put('/api/user/photo', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { profilePhoto } = req.body;
    
    if (!profilePhoto) {
      return res.status(400).json({ error: 'Profile photo data is required' });
    }
    
    if (!profilePhoto.startsWith('data:image/')) {
      return res.status(400).json({ error: 'Invalid image format' });
    }
    
    if (profilePhoto.length > 7000000) {
      return res.status(400).json({ error: 'Image file is too large. Please use an image smaller than 5MB.' });
    }
    
    await User.findByIdAndUpdate(userId, {
      profilePhoto: profilePhoto
    });
    
    res.json({ 
      message: 'Profile photo updated successfully',
      profilePhoto: profilePhoto
    });
  } catch (error) {
    console.error('Upload photo error:', error);
    res.status(500).json({ error: 'Failed to upload photo' });
  }
});

app.delete('/api/user/photo', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    await User.findByIdAndUpdate(userId, {
      $unset: { profilePhoto: 1 }
    });
    
    res.json({ message: 'Profile photo removed successfully' });
  } catch (error) {
    console.error('Remove photo error:', error);
    res.status(500).json({ error: 'Failed to remove photo' });
  }
});

app.delete('/api/user/chat-history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    await Chat.deleteMany({ userId });
    
    res.json({ message: 'Chat history cleared successfully' });
  } catch (error) {
    console.error('Clear chat history error:', error);
    res.status(500).json({ error: 'Failed to clear chat history' });
  }
});

app.get('/api/user/export', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { type = 'all' } = req.query;
    
    const user = await User.findById(userId).select('-password');
    let exportData = {};
    
    if (type === 'all' || type === 'profile') {
      exportData.profile = {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        company: user.company,
        timezone: user.timezone,
        createdAt: user.createdAt,
        streakData: user.streakData
      };
    }
    
    if (type === 'all' || type === 'goals') {
      const goals = await Goal.find({ userId });
      const lifeGoals = await LifeGoal.find({ userId });
      exportData.goals = goals;
      exportData.lifeGoals = lifeGoals;
    }
    
    if (type === 'all' || type === 'coaching') {
      const chatHistory = await Chat.find({ userId });
      exportData.chatHistory = chatHistory;
    }
    
    if (type === 'all') {
      const notifications = await Notification.find({ userId });
      const insights = await Insight.find({ userId });
      exportData.notifications = notifications;
      exportData.insights = insights;
    }
    
    exportData.exportDate = new Date();
    exportData.exportType = type;
    
    res.json(exportData);
  } catch (error) {
    console.error('Export data error:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

app.delete('/api/user/account', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { confirmation } = req.body;
    
    if (confirmation !== 'DELETE MY ACCOUNT') {
      return res.status(400).json({ error: 'Invalid confirmation text' });
    }
    
    await Promise.all([
      User.findByIdAndDelete(userId),
      Goal.deleteMany({ userId }),
      LifeGoal.deleteMany({ userId }),
      Chat.deleteMany({ userId }),
      Notification.deleteMany({ userId }),
      Insight.deleteMany({ userId }),
      Message.deleteMany({ userId })
    ]);
    
    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

// MANUAL SEED ENDPOINT - WORKING VERSION
app.get('/api/manual-seed-prompts', authenticateToken, async (req, res) => {
  try {
    console.log('🌱 Manual seed called by user:', req.user.userId);
    
    const existingCount = await DailyPrompt.countDocuments();
    if (existingCount > 0) {
      return res.json({ 
        message: `${existingCount} prompts already exist`, 
        skipped: true,
        existingCount
      });
    }

    const prompts = [
      {
        prompt: "What's one decision you made today that you're proud of, and why?",
        category: "reflection",
        difficulty: "easy",
        tags: ["decision-making", "self-awareness"]
      },
      {
        prompt: "Describe a moment this week when you felt completely in your element. What were you doing?",
        category: "reflection",
        difficulty: "medium",
        tags: ["flow-state", "strengths"]
      },
      {
        prompt: "What's something you learned about yourself through a recent challenge or setback?",
        category: "reflection",
        difficulty: "medium",
        tags: ["resilience", "growth"]
      },
      {
        prompt: "If you could have a conversation with yourself from one year ago, what would you tell them?",
        category: "reflection",
        difficulty: "hard",
        tags: ["growth", "perspective"]
      },
      {
        prompt: "What's one assumption you held about business that you've recently questioned or changed?",
        category: "reflection",
        difficulty: "medium",
        tags: ["assumptions", "learning"]
      },
      {
        prompt: "Describe a time when you had to trust your gut instinct. What happened?",
        category: "reflection",
        difficulty: "medium",
        tags: ["intuition", "decision-making"]
      },
      {
        prompt: "What's the most important lesson you've learned from a mentor or role model?",
        category: "reflection",
        difficulty: "easy",
        tags: ["mentorship", "learning"]
      },
      {
        prompt: "When do you feel most creative and innovative? What conditions enable this state?",
        category: "reflection",
        difficulty: "medium",
        tags: ["creativity", "productivity"]
      },
      {
        prompt: "What's one fear that you've overcome in your entrepreneurial journey?",
        category: "reflection",
        difficulty: "hard",
        tags: ["fear", "courage"]
      },
      {
        prompt: "How has your definition of success evolved over the past year?",
        category: "reflection",
        difficulty: "medium",
        tags: ["success", "values"]
      },
      {
        prompt: "What's something you do daily that brings you joy, even during stressful times?",
        category: "mindfulness",
        difficulty: "easy",
        tags: ["joy", "stress-management"]
      },
      {
        prompt: "What's one way you've learned to manage overwhelm or stress in your business?",
        category: "mindfulness",
        difficulty: "medium",
        tags: ["stress-management", "coping"]
      },
      {
        prompt: "How do you typically recharge when you're feeling mentally exhausted?",
        category: "mindfulness",
        difficulty: "easy",
        tags: ["recovery", "energy"]
      },
      {
        prompt: "What's one goal you're working toward that scares and excites you equally?",
        category: "goal-setting",
        difficulty: "medium",
        tags: ["goals", "fear", "excitement"]
      },
      {
        prompt: "If you could only accomplish one thing this quarter, what would it be and why?",
        category: "goal-setting",
        difficulty: "medium",
        tags: ["priorities", "focus"]
      },
      {
        prompt: "What's one habit you want to build that would have the biggest impact on your business?",
        category: "goal-setting",
        difficulty: "easy",
        tags: ["habits", "impact"]
      },
      {
        prompt: "What's one quality you admire in other leaders that you'd like to develop in yourself?",
        category: "leadership",
        difficulty: "medium",
        tags: ["leadership", "development"]
      },
      {
        prompt: "How do you handle disagreements or conflicts within your team?",
        category: "leadership",
        difficulty: "hard",
        tags: ["conflict", "resolution"]
      },
      {
        prompt: "What's one way you've grown as a leader through a difficult situation?",
        category: "leadership",
        difficulty: "medium",
        tags: ["growth", "challenges"]
      },
      {
        prompt: "How do you celebrate wins and acknowledge your team's contributions?",
        category: "leadership",
        difficulty: "easy",
        tags: ["recognition", "celebration"]
      },
      {
        prompt: "What's one assumption about your customers or market that you recently tested?",
        category: "growth",
        difficulty: "medium",
        tags: ["assumptions", "testing"]
      },
      {
        prompt: "How do you stay curious and open to new ideas in your field?",
        category: "growth",
        difficulty: "easy",
        tags: ["curiosity", "learning"]
      },
      {
        prompt: "What's one thing about your entrepreneurial journey that you're genuinely grateful for today?",
        category: "gratitude",
        difficulty: "easy",
        tags: ["gratitude", "appreciation"]
      },
      {
        prompt: "What's one challenge you're currently facing that's actually helping you grow?",
        category: "gratitude",
        difficulty: "medium",
        tags: ["challenges", "growth"]
      },
      {
        prompt: "What's the most creative solution you've come up with to solve a business problem?",
        category: "challenge",
        difficulty: "medium",
        tags: ["creativity", "problem-solving"]
      }
    ];

    console.log(`📝 Attempting to insert ${prompts.length} prompts`);
    const savedPrompts = await DailyPrompt.insertMany(prompts);
    console.log(`✅ Successfully saved ${savedPrompts.length} prompts`);
    
    res.json({
      message: `Successfully seeded ${savedPrompts.length} daily prompts!`,
      count: savedPrompts.length,
      success: true,
      prompts: savedPrompts.slice(0, 3).map(p => p.prompt)
    });

  } catch (error) {
    console.error('❌ Manual seed error:', error);
    res.status(500).json({ 
      error: 'Failed to seed prompts',
      details: error.message 
    });
  }
});

// Manual endpoint to add custom prompts
app.post('/api/manual-add-custom-prompts', authenticateToken, async (req, res) => {
  try {
    console.log('🌱 Manual add custom prompts called by user:', req.user.userId);
    
    const { prompts } = req.body;
    
    if (!prompts || !Array.isArray(prompts)) {
      return res.status(400).json({ 
        error: 'Prompts array is required',
        received: typeof prompts
      });
    }

    console.log(`📝 Attempting to insert ${prompts.length} custom prompts`);
    
    // Validate each prompt has required fields
    const validPrompts = prompts.filter(prompt => 
      prompt.prompt && 
      prompt.category && 
      prompt.difficulty
    );

    if (validPrompts.length !== prompts.length) {
      console.log(`⚠️ ${prompts.length - validPrompts.length} prompts were invalid and skipped`);
    }

    // Add default fields to each prompt
    const promptsToInsert = validPrompts.map(prompt => ({
      prompt: prompt.prompt,
      category: prompt.category,
      difficulty: prompt.difficulty,
      tags: prompt.tags || [],
      isActive: true,
      usageCount: 0,
      createdAt: new Date()
    }));

    const savedPrompts = await DailyPrompt.insertMany(promptsToInsert);
    console.log(`✅ Successfully saved ${savedPrompts.length} custom prompts`);
    
    res.json({
      message: `Successfully added ${savedPrompts.length} custom prompts!`,
      count: savedPrompts.length,
      success: true,
      skipped: prompts.length - validPrompts.length,
      examples: savedPrompts.slice(0, 3).map(p => p.prompt.substring(0, 50) + '...')
    });

  } catch (error) {
    console.error('❌ Manual add custom prompts error:', error);
    res.status(500).json({ 
      error: 'Failed to add custom prompts',
      details: error.message 
    });
  }
});
// ==========================================
// DAILY PROMPTS API ROUTES
// ==========================================

app.get('/api/daily-prompt/today', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let assignment = await DailyPromptAssignment.findOne({ date: today })
      .populate('promptId');

    if (!assignment) {
      const nextPrompt = await getNextPrompt();
      if (!nextPrompt) {
        return res.status(404).json({ error: 'No prompts available' });
      }

      assignment = new DailyPromptAssignment({
        date: today,
        promptId: nextPrompt._id
      });
      await assignment.save();
      await assignment.populate('promptId');

      nextPrompt.usageCount += 1;
      nextPrompt.lastUsed = new Date();
      await nextPrompt.save();
    }

    const userResponse = await DailyPromptResponse.findOne({
      userId,
      promptId: assignment.promptId._id,
      createdAt: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      }
    });

    res.json({
      prompt: assignment.promptId,
      assignment: {
        date: assignment.date,
        responseCount: assignment.responseCount
      },
      userResponse: userResponse,
      hasResponded: !!userResponse
    });

  } catch (error) {
    console.error('Get today\'s prompt error:', error);
    res.status(500).json({ error: 'Failed to get today\'s prompt' });
  }
});

app.post('/api/daily-prompt/respond', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { promptId, response, mood, isPublic, timeToComplete } = req.body;

    if (!promptId || !response || !response.trim()) {
      return res.status(400).json({ error: 'Prompt ID and response are required' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingResponse = await DailyPromptResponse.findOne({
      userId,
      promptId,
      createdAt: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      }
    });

    if (existingResponse) {
      existingResponse.response = response.trim();
      existingResponse.mood = mood || 'neutral';
      existingResponse.isPublic = isPublic || false;
      existingResponse.wordCount = response.trim().split(/\s+/).length;
      existingResponse.timeToComplete = timeToComplete;
      existingResponse.updatedAt = new Date();
      await existingResponse.save();

      res.json({
        message: 'Response updated successfully',
        response: existingResponse,
        isUpdate: true
      });
    } else {
      const newResponse = new DailyPromptResponse({
        userId,
        promptId,
        response: response.trim(),
        mood: mood || 'neutral',
        wordCount: response.trim().split(/\s+/).length,
        timeToComplete: timeToComplete
      });

      await newResponse.save();

      await DailyPromptAssignment.findOneAndUpdate(
        { date: today, promptId },
        { $inc: { responseCount: 1 } }
      );

      try {
        const notification = new Notification({
          userId,
          type: 'system',
          title: '✅ Daily Prompt Completed!',
          content: `Great job reflecting today! You've completed your daily prompt with a ${newResponse.wordCount}-word response.`,
          priority: 'normal'
        });
        await notification.save();
      } catch (notifError) {
        console.error('Error creating daily prompt notification:', notifError);
      }

      res.json({
        message: 'Response submitted successfully',
        response: newResponse,
        isUpdate: false
      });
    }

  } catch (error) {
    console.error('Submit daily prompt response error:', error);
    res.status(500).json({ error: 'Failed to submit response' });
  }
});

app.get('/api/daily-prompt/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { limit = 10, page = 1 } = req.query;

    const responses = await DailyPromptResponse.find({ userId })
      .populate('promptId', 'prompt category difficulty')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const totalResponses = await DailyPromptResponse.countDocuments({ userId });
    const totalPages = Math.ceil(totalResponses / parseInt(limit));

    res.json({
      responses,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalResponses,
        hasMore: parseInt(page) < totalPages
      }
    });

  } catch (error) {
    console.error('Get prompt history error:', error);
    res.status(500).json({ error: 'Failed to get prompt history' });
  }
});

app.get('/api/daily-prompt/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const totalResponses = await DailyPromptResponse.countDocuments({ userId });
    
    const responses = await DailyPromptResponse.find({ userId })
      .sort({ createdAt: -1 })
      .limit(30);

    let currentStreak = 0;
    let longestStreak = 0;
    
    if (responses.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todayResponse = responses.find(r => {
        const responseDate = new Date(r.createdAt);
        responseDate.setHours(0, 0, 0, 0);
        return responseDate.getTime() === today.getTime();
      });

      if (todayResponse) {
        currentStreak = 1;
        
        for (let i = 1; i < responses.length; i++) {
          const currentDate = new Date(responses[i-1].createdAt);
          const prevDate = new Date(responses[i].createdAt);
          currentDate.setHours(0, 0, 0, 0);
          prevDate.setHours(0, 0, 0, 0);
          
          const dayDiff = (currentDate - prevDate) / (1000 * 60 * 60 * 24);
          
          if (dayDiff === 1) {
            currentStreak++;
          } else {
            break;
          }
        }
      }

      let tempStreak = 1;
      longestStreak = 1;
      
      for (let i = 1; i < responses.length; i++) {
        const currentDate = new Date(responses[i-1].createdAt);
        const prevDate = new Date(responses[i].createdAt);
        currentDate.setHours(0, 0, 0, 0);
        prevDate.setHours(0, 0, 0, 0);
        
        const dayDiff = (currentDate - prevDate) / (1000 * 60 * 60 * 24);
        
        if (dayDiff === 1) {
          tempStreak++;
          longestStreak = Math.max(longestStreak, tempStreak);
        } else {
          tempStreak = 1;
        }
      }
    }

    res.json({
      totalResponses,
      currentStreak,
      longestStreak,
      averageWordCount: responses.length > 0 ? 
        Math.round(responses.reduce((sum, r) => sum + (r.wordCount || 0), 0) / responses.length) : 0
    });

  } catch (error) {
    console.error('Get daily prompt stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Enhanced health check
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
      messageDeleting: 'enabled',
      manualSeedEndpoint: 'enabled'
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

// Run daily prompt notifications at 8:00 AM every day
cron.schedule('0 5 * * *', async () => {
  console.log('🌅 Running daily prompt notifications...');
  await createDailyPromptNotification();
}, {
  timezone: "America/Chicago"
});

console.log('⏰ Daily prompt scheduler started');

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
  console.log(`🌱 Manual Seed Endpoint: /api/manual-seed-prompts ✅`);
});
