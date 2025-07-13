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

// Make sure all important settings are configured
const requiredSettings = ['STRIPE_SECRET_KEY', 'JWT_SECRET', 'MONGODB_URI'];
const missingSettings = requiredSettings.filter(setting => !process.env[setting]);

if (missingSettings.length > 0) {
    console.error('❌ Missing required settings:', missingSettings);
    console.error('Please check your .env file and add these settings');
    process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors()); // Allow all origins for testing

// ==========================================
// STRIPE WEBHOOKS - MUST BE BEFORE express.json()
// ==========================================

// Stripe webhook endpoint
app.post('/api/webhooks/stripe', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log('Received webhook event:', event.type);

  try {
    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;
        
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
        
      case 'customer.subscription.deleted':
        await handleSubscriptionCanceled(event.data.object);
        break;
        
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
        
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
        
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({received: true});
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).json({error: 'Webhook handler failed'});
  }
});

// ==========================================
// WEBHOOK HANDLER FUNCTIONS
// ==========================================

async function handleSubscriptionCreated(subscription) {
  console.log('Subscription created:', subscription.id);
  
  try {
    // Find user by Stripe customer ID
    const user = await User.findOne({ stripeCustomerId: subscription.customer });
    
    if (user) {
      // Update user subscription status
      user.subscription = {
        plan: subscription.metadata.plan || 'yearly',
        status: subscription.status,
        stripeSubscriptionId: subscription.id,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000)
      };

 // RIGHT BEFORE await user.save(); add these lines:
console.log('🔍 About to save user with this data:');
console.log('User object keys:', Object.keys(user.toObject()));
console.log('User _id before save:', user._id);
console.log('User email:', user.email);

// Check if _id is somehow null
if (user._id === null || user._id === undefined) {
  console.log('🚨 WARNING: User _id is null/undefined!');
  delete user._id; // Remove it so MongoDB can auto-generate
}
        
      await user.save();
      
      // Create welcome notification
      const notification = new Notification({
        userId: user._id,
        type: 'billing',
        title: '🎉 Welcome to EEH!',
        content: 'Your subscription is now active. Start your emotional health journey today!',
        priority: 'high'
      });
      
      await notification.save();
      console.log('User subscription updated and welcome notification sent');
    }
  } catch (error) {
    console.error('Error handling subscription created:', error);
  }
}

async function handleSubscriptionUpdated(subscription) {
  console.log('Subscription updated:', subscription.id);
  
  try {
    const user = await User.findOne({ 'subscription.stripeSubscriptionId': subscription.id });
    
    if (user) {
      user.subscription.status = subscription.status;
      user.subscription.currentPeriodStart = new Date(subscription.current_period_start * 1000);
      user.subscription.currentPeriodEnd = new Date(subscription.current_period_end * 1000);
      
      await user.save();
      
      // Notify user of status changes
      if (subscription.status === 'past_due') {
        const notification = new Notification({
          userId: user._id,
          type: 'billing',
          title: '⚠️ Payment Issue',
          content: 'Your payment failed. Please update your payment method to continue service.',
          priority: 'high'
        });
        await notification.save();
      }
    }
  } catch (error) {
    console.error('Error handling subscription updated:', error);
  }
}

async function handleSubscriptionCanceled(subscription) {
  console.log('Subscription canceled:', subscription.id);
  
  try {
    const user = await User.findOne({ 'subscription.stripeSubscriptionId': subscription.id });
    
    if (user) {
      user.subscription.status = 'canceled';
      await user.save();
      
      // Send cancellation notification
      const notification = new Notification({
        userId: user._id,
        type: 'billing',
        title: '❌ Subscription Canceled',
        content: 'Your subscription has been canceled. You can reactivate anytime.',
        priority: 'normal'
      });
      await notification.save();
    }
  } catch (error) {
    console.error('Error handling subscription canceled:', error);
  }
}

async function handlePaymentSucceeded(invoice) {
  console.log('Payment succeeded for invoice:', invoice.id);
  
  try {
    if (invoice.subscription) {
      const user = await User.findOne({ stripeCustomerId: invoice.customer });
      
      if (user) {
        // Ensure user has active access
        user.subscription.status = 'active';
        await user.save();
        
        // Send payment confirmation (only for renewals, not first payment)
        if (invoice.billing_reason === 'subscription_cycle') {
          const notification = new Notification({
            userId: user._id,
            type: 'billing',
            title: '✅ Payment Successful',
            content: `Your subscription has been renewed. Amount: $${(invoice.amount_paid / 100).toFixed(2)}`,
            priority: 'normal'
          });
          await notification.save();
        }
      }
    }
  } catch (error) {
    console.error('Error handling payment succeeded:', error);
  }
}

async function handlePaymentFailed(invoice) {
  console.log('Payment failed for invoice:', invoice.id);
  
  try {
    if (invoice.subscription) {
      const user = await User.findOne({ stripeCustomerId: invoice.customer });
      
      if (user) {
        // Send payment failure notification
        const notification = new Notification({
          userId: user._id,
          type: 'billing',
          title: '❌ Payment Failed',
          content: 'Your payment failed. Please update your payment method to avoid service interruption.',
          priority: 'high'
        });
        await notification.save();
      }
    }
  } catch (error) {
    console.error('Error handling payment failed:', error);
  }
}

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

// Email configuration - FIXED VERSION
let transporter = null;
if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
  console.log("📧 Email service configured");
} else {
  console.log("⚠️ Email credentials not found");
  console.log("EMAIL_USER exists:", !!process.env.EMAIL_USER);
  console.log("EMAIL_PASS exists:", !!process.env.EMAIL_PASS);
}

// Connect to MongoDB
console.log('🔍 Connecting to MongoDB...');
console.log('📍 MongoDB URI configured:', !!process.env.MONGODB_URI);

if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is not set');
  process.exit(1);
}

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB Atlas successfully');
    console.log('📊 Database connection state:', mongoose.connection.readyState);
    createDefaultRooms();
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    console.error('🔍 Check your MONGODB_URI in Render environment variables');
    process.exit(1);
  });

const userSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: { type: String, unique: true },
  password: String,
  stripeCustomerId: String,
    selectedCoach: {
    type: String,
    enum: ['coach1', 'coach2'],
    default: 'coach1'
  },
  coachPreferences: {
    voiceEnabled: { type: Boolean, default: true },
    lastCoachSwitch: { type: Date, default: null }
  },
 subscription: {
    plan: String,
    status: String,
    stripeSubscriptionId: String,
    currentPeriodStart: Date,
    currentPeriodEnd: Date,
   couponUsed: String  
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
}, {
  id: false  // ADD THIS LINE - disables the virtual id field
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
type: { type: String, enum: ['coaching', 'community', 'system', 'billing', 'goals'], required: true },  title: { type: String, required: true },
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
  // ADD THESE TWO LINES HERE:
  likes: [{
    userId: String,
    username: String,
    timestamp: { type: Date, default: Date.now }
  }],
  likeCount: { type: Number, default: 0 },
     // Image upload fields
  image: { type: String }, // Base64 image data
  imageName: { type: String }, // Original filename
  imageSize: { type: Number }, // File size in bytes
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

// Daily Progress Schema - NEW
const dailyProgressSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true }, // YYYY-MM-DD format
  goalProgress: [{
    goalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Goal', required: true },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date },
    area: { type: String, required: true } // Store area for easy filtering
  }],
  totalGoals: { type: Number, default: 0 },
  completedGoals: { type: Number, default: 0 },
  completionPercentage: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Compound index for efficient queries
dailyProgressSchema.index({ userId: 1, date: 1 }, { unique: true });

const DailyProgress = mongoose.model('DailyProgress', dailyProgressSchema);

// Life Goals Schema - NEW
const lifeGoalSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  area: { type: String, required: true }, // mind, spirit, body, work, relationships, fun, finances
  bigGoal: { type: String, required: true },
  dailyAction: { type: String, required: true },
  streak: { type: Number, default: 0 },
  lastCompletedDate: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const LifeGoal = mongoose.model('LifeGoal', lifeGoalSchema);

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

// JWT Middleware with subscription check
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', async (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' });
    }
    
    // Check subscription status
    try {
      const userRecord = await User.findById(user.userId);
      if (!userRecord) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Allow access for free accounts or active subscriptions
      const subscription = userRecord.subscription;
      const now = new Date();
      
      if (subscription.plan === 'free' || 
          subscription.status === 'active' ||
          (subscription.currentPeriodEnd && new Date(subscription.currentPeriodEnd) > now)) {
        req.user = user;
        next();
      } else {
        return res.status(402).json({ 
          message: 'Subscription expired. Please renew to continue.',
          subscriptionStatus: subscription.status,
          expired: true
        });
      }
    } catch (error) {
      console.error('Subscription check error:', error);
      req.user = user; // Allow access on error
      next();
    }
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

app.post('/api/auth/register', async (req, res) => {
  try {

    console.log('🚀 REGISTRATION ENDPOINT CALLED');
    console.log('📦 Request body received:', req.body);
    console.log('📧 Email from request:', req.body.email);
    console.log('💳 Stripe data:', {
      customerId: req.body.stripeCustomerId,
      subscriptionId: req.body.subscriptionId,
      paymentIntentId: req.body.paymentIntentId
    });
      
    const { 
      firstName, 
      lastName, 
      email, 
      password, 
      plan, 
      stripeCustomerId, 
      subscriptionId,
      paymentIntentId, 
      couponCode 
    } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

// Determine what type of account to create based on coupon
let finalPlan = plan || 'yearly';
let subscriptionStatus = 'active';

// Handle special coupon cases
if (couponCode === 'EEHCLIENT') {
  // This is a completely free account
  finalPlan = 'free';
  subscriptionStatus = 'active';
} else if (couponCode === 'FREEMONTH' || couponCode === 'EEHCLIENT6') {
  // These get discounts but keep their chosen plan
  finalPlan = plan;
  subscriptionStatus = 'active';
}

const user = new User({
  firstName,
  lastName,
  email,
  password: hashedPassword,
  stripeCustomerId,
  subscription: {
    plan: finalPlan,
    status: subscriptionStatus,
    stripeSubscriptionId: subscriptionId,
    couponUsed: couponCode || null,
    // Set period dates if subscription exists
    ...(subscriptionId && subscriptionId !== 'free_account_' + Date.now() && {
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + (finalPlan === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000)
    })
  },
  streakData: {
    currentStreak: 1,
    lastLoginDate: new Date(),
    longestStreak: 1
  }
});

await user.save();

// Create welcome notification based on coupon
let welcomeMessage = 'Welcome to Entrepreneur Emotional Health!';
if (couponCode === 'EEHCLIENT') {
  welcomeMessage = '🎉 Welcome! Your free account is now active.';
} else if (couponCode === 'FREEMONTH') {
  welcomeMessage = '🎉 Welcome! Your first month is free.';
} else if (couponCode === 'EEHCLIENT6') {
  welcomeMessage = '🎉 Welcome! Your first 6 months are free.';
}

const notification = new Notification({
  userId: user._id,
  type: 'system',
  title: 'Welcome to EEH!',
  content: welcomeMessage,
  priority: 'high'
});
await notification.save();

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
    email: user.email,
    subscription: user.subscription
  },
  streakData: {
    currentStreak: 1,
    longestStreak: 1
  },
  couponApplied: couponCode || null
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

app.post('/api/auth/forgot-password', async (req, res) => {
  console.log('🔍 Forgot password request received');
  console.log('📧 Transporter exists:', !!transporter);
  
  try {
    const { email } = req.body;
    
    if (!email) {
      console.log('❌ No email provided');
      return res.status(400).json({ message: 'Email is required' });
    }

    if (!transporter) {
      console.log('❌ Email service not configured');
      return res.status(500).json({ message: 'Email service not configured' });
    }

    console.log('🔍 Looking for user with email:', email);
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      console.log('⚠️ User not found, but sending success message anyway');
      return res.status(200).json({ 
        message: 'If an account with that email exists, a password reset link has been sent.' 
      });
    }

    console.log('✅ User found, generating reset token');
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000;
    
    await user.save();
    console.log('✅ Reset token saved to database');

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password.html?token=${resetToken}`;
    console.log('📧 Sending email to:', user.email);

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
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully');

    res.status(200).json({ 
      message: 'If an account with that email exists, a password reset link has been sent.' 
    });

  } catch (error) {
    console.error('❌ Forgot password error:', error);
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

await user.save(); // <- THIS LINE WAS MISSING

res.status(200).json({ message: 'Password reset successful' });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Error resetting password' });
  }
});

// REPLACE the existing /api/payments/create-subscription endpoint in server.js with this:

// REPLACE this section in server.js around line 670

app.post('/api/payments/create-subscription', async (req, res) => {
  try {
    const { email, plan, firstName, lastName, couponCode } = req.body;
    
    console.log('Creating subscription with coupon:', couponCode);
    
   // Only validate coupon if one is provided
if (couponCode) {
  try {
    // First try to validate directly with Stripe
    try {
      const stripeCoupon = await stripe.coupons.retrieve(couponCode.toUpperCase());
      if (!stripeCoupon.valid) {
        return res.status(400).json({ 
          error: 'This coupon has expired or reached its usage limit' 
        });
      }
      console.log('✅ Stripe coupon validated:', stripeCoupon.id);
    } catch (stripeCouponError) {
      // If coupon doesn't exist in Stripe, check local list
      console.log('⚠️ Coupon not found in Stripe, checking local list:', couponCode);
      
      const validCoupons = {
        'EEHCLIENT': { type: 'forever_free' },
        'FREEMONTH': { type: 'first_month_free' },
        'EEHCLIENT6': { type: 'six_months_free' },
        'CRAZYDISCOUNT': { type: 'test_discount' }
      };

      const localCoupon = validCoupons[couponCode.toUpperCase()];
      if (!localCoupon) {
        return res.status(400).json({ 
          error: 'Invalid coupon code. Please check and try again.' 
        });
      }
    }
        // Then verify with Stripe (only if it exists in Stripe)
        try {
          const stripeCoupon = await stripe.coupons.retrieve(couponCode.toUpperCase());
          if (!stripeCoupon.valid) {
            return res.status(400).json({ 
              error: 'This coupon has expired or reached its usage limit' 
            });
          }
          console.log('✅ Stripe coupon validated:', stripeCoupon.id);
        } catch (stripeCouponError) {
          // If coupon doesn't exist in Stripe but exists locally, that might be okay for some coupons
          console.log('⚠️ Coupon not found in Stripe, but exists locally:', couponCode);
          // Comment out this return to allow local-only coupons
          // return res.status(400).json({ 
          //   error: 'Invalid coupon code. Please check and try again.' 
          // });
        }
      } catch (validationError) {
        console.error('Coupon validation error:', validationError);
        return res.status(400).json({ 
          error: 'Error validating coupon. Please try again.' 
        });
      }
    }

    // Create Stripe customer
    const customer = await stripe.customers.create({
      email: email,
      name: `${firstName} ${lastName}`,
      metadata: { 
        plan: plan,
        source: 'eeh_signup',
        couponUsed: couponCode || 'none'
      }
    });

    console.log('✅ Customer created:', customer.id);

    // Price IDs - Make sure these match your actual Stripe Price IDs
    const priceIds = {
      monthly: 'price_1Rhv3uIjRmg2uv1cnnt5X12z', 
      yearly: 'price_1Rk5FYIjRmg2uv1caGouvbFc'   
    };

    const priceId = priceIds[plan];
    if (!priceId) {
      return res.status(400).json({ error: 'Invalid plan selected' });
    }

    console.log('💰 Using price ID:', priceId, 'for plan:', plan);

    // Handle completely free coupons differently
    if (couponCode === 'EEHCLIENT') {
      console.log('🆓 Creating free subscription for EEHCLIENT coupon');
      
      // For completely free accounts, create a $0 subscription
      const freeSubscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: priceId }],
        coupon: 'EEHCLIENT', // Your 100% off coupon in Stripe
        metadata: {
          plan: plan,
          userId: 'pending',
          couponCode: couponCode,
          accountType: 'free'
        }
      });

      return res.json({
        subscriptionId: freeSubscription.id,
        clientSecret: null, // No payment needed
        customerId: customer.id,
        couponApplied: couponCode,
        isFree: true
      });
    }

    // For paid subscriptions (including discounted ones)
    const subscriptionConfig = {
      customer: customer.id,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        plan: plan,
        userId: 'pending',
        couponCode: couponCode || 'none'
      }
    };

    // Apply coupon if provided
    if (couponCode && couponCode !== 'EEHCLIENT') {
      subscriptionConfig.coupon = couponCode.toUpperCase();
      console.log('🎫 Applying coupon to subscription:', couponCode.toUpperCase());
    }

    // Create subscription
    const subscription = await stripe.subscriptions.create(subscriptionConfig);
    
    console.log('✅ Subscription created:', subscription.id);

// Check if payment intent exists (it won't for $0 invoices)
let clientSecret = null;
let requiresPayment = true;

if (subscription.latest_invoice && subscription.latest_invoice.payment_intent) {
  clientSecret = subscription.latest_invoice.payment_intent.client_secret;
  console.log('💳 Payment intent created, client secret available');
} else {
  // No payment intent means $0 invoice (due to 100% coupon)
  requiresPayment = false;
  console.log('🆓 No payment required (100% discount applied)');
}

res.json({
  subscriptionId: subscription.id,
  clientSecret: clientSecret,
  customerId: customer.id,
  couponApplied: couponCode || null,
  requiresPayment: requiresPayment,
  isFree: !requiresPayment
});

  } catch (error) {
    console.error('❌ Subscription creation error:', error);
    
    // Provide more detailed error information
    let errorMessage = 'Failed to create subscription';
    
    if (error.type === 'StripeCardError') {
      errorMessage = 'Card error: ' + error.message;
    } else if (error.type === 'StripeInvalidRequestError') {
      errorMessage = 'Invalid request: ' + error.message;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    res.status(500).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ADD THIS NEW ENDPOINT - Validate coupon before applying
app.post('/api/payments/validate-coupon', async (req, res) => {
  try {
    const { couponCode } = req.body;
    
    if (!couponCode) {
      return res.status(400).json({ error: 'Coupon code is required' });
    }

   // First try to validate with Stripe directly
try {
  const stripeCoupon = await stripe.coupons.retrieve(couponCode.toUpperCase());
  if (!stripeCoupon.valid) {
    return res.status(400).json({ 
      valid: false, 
      error: 'Coupon has expired or reached its usage limit' 
    });
  }
  
  // If Stripe coupon exists and is valid, create response
  let couponType = 'standard_discount';
  let description = 'Discount applied';
  
  if (stripeCoupon.percent_off === 100) {
    couponType = stripeCoupon.duration === 'forever' ? 'forever_free' : 'first_month_free';
    description = `${stripeCoupon.percent_off}% off ${stripeCoupon.duration === 'forever' ? 'forever' : 'for ' + (stripeCoupon.duration_in_months || 1) + ' month(s)'}`;
  } else if (stripeCoupon.percent_off) {
    description = `${stripeCoupon.percent_off}% off`;
  } else if (stripeCoupon.amount_off) {
    description = `$${(stripeCoupon.amount_off / 100).toFixed(2)} off`;
  }
  
  return res.json({
    valid: true,
    coupon: {
      code: couponCode.toUpperCase(),
      type: couponType,
      description: description,
      discount: description
    }
  });
  
} catch (stripeError) {
  console.log('Coupon not found in Stripe, checking local list...');
  
  // Fallback to local validation for special coupons
  const validCoupons = {
    'EEHCLIENT': {
      type: 'forever_free',
      description: 'Completely free account',
      discount: '100% off forever'
    },
      'FREETOOME': {
    type: 'forever_free',
    description: '100% off',
    discount: '100% off'
  }
  };

  const coupon = validCoupons[couponCode.toUpperCase()];
  
  if (!coupon) {
    return res.status(400).json({ 
      valid: false, 
      error: 'Invalid coupon code' 
    });
  }
}

    // Optionally check with Stripe to ensure coupon is still active
    try {
      const stripeCoupon = await stripe.coupons.retrieve(couponCode.toUpperCase());
      if (!stripeCoupon.valid) {
        return res.status(400).json({ 
          valid: false, 
          error: 'Coupon has expired or reached its usage limit' 
        });
      }
    } catch (stripeError) {
      console.error('Stripe coupon validation error:', stripeError);
      // Continue with local validation if Stripe check fails
    }

    res.json({
      valid: true,
      coupon: {
        code: couponCode.toUpperCase(),
        ...coupon
      }
    });

  } catch (error) {
    console.error('Coupon validation error:', error);
    res.status(500).json({ 
      error: 'Failed to validate coupon',
      message: error.message 
    });
  }
});

// Coach Configuration
const COACHES = {
  coach1: {
    name: "Blair Reynolds", 
    assistantId: "asst_tpShoq1kPGvtcFhMdxb6EmYg", 
    voiceId: null, // We'll add this after setting up ElevenLabs
    personality: "Humorous, empathy-oriented coach focused on transformative solutions",
    description: "Entrepreneurial enthusiasm with a focus on personal and relational health"
  },
  coach2: {
    name: "Dave Charlson",
    assistantId: "asst_azEXcPuwPHRaSXWzv2tPzI4t", // We'll create Dave's assistant next
    voiceId: null, // We'll add this after setting up ElevenLabs
    personality: "Warm, strategic coach focused on sustainable growth and well-being",
    description: "Balanced approach combining business success with personal fulfillment"
  }
};

// Send message to AI Assistant with Coach Selection
app.post('/api/chat/send', authenticateToken, async (req, res) => {
  try {
    if (!openai) {
      return res.json({ 
        response: "AI chat is temporarily unavailable. Your other app features are working!" 
      });
    }

    const { message } = req.body;
    const userId = req.user.userId;

    // Get user's selected coach
    const user = await User.findById(userId).select('selectedCoach');
    const selectedCoach = user?.selectedCoach || 'coach1';
    const coach = COACHES[selectedCoach];
    
    if (!coach || !coach.assistantId) {
      return res.status(400).json({ 
        error: 'Selected coach is not available. Please try again.' 
      });
    }

    console.log(`🎯 Using ${coach.name} (${selectedCoach}) for user ${userId}`);

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
      assistant_id: coach.assistantId // Use selected coach's assistant
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
      { role: 'assistant', content: response, timestamp: new Date(), coach: selectedCoach }
    );
    chat.updatedAt = new Date();
    await chat.save();

    // Generate insights after successful chat
    if (chat && chat.messages.length >= 6 && chat.messages.length % 4 === 0) {
      setTimeout(() => generateInsights(userId, chat.messages), 3000);
    }

    res.json({ 
      response,
      coach: {
        name: coach.name,
        id: selectedCoach
      }
    });

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

    console.log(`Creating daily prompt for ${today.toISOString().split('T')[0]}`);

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
      promptId: nextPrompt._id
    });
    
    await assignment.save();
    console.log(`Created fresh daily prompt assignment: "${nextPrompt.prompt.substring(0, 50)}..."`);

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
      title: 'Daily Prompt Available!',
      content: `Today's reflection: "${nextPrompt.prompt.substring(0, 100)}${nextPrompt.prompt.length > 100 ? '...' : ''}"`,
      priority: 'normal',
      createdAt: new Date()
    }));

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
      console.log(`Created ${notifications.length} daily prompt notifications`);
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

// Create new notification
app.post('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const { type, title, content, priority = 'normal' } = req.body;
    
    if (!type || !title || !content) {
      return res.status(400).json({ error: 'Type, title, and content are required' });
    }
    
    const notification = new Notification({
      userId: req.user.userId,
      type,
      title,
      content,
      priority,
      read: false
    });
    
    await notification.save();
    res.status(201).json(notification);
    
  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({ error: 'Failed to create notification' });
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

    // Handle image upload
    if (req.body.image) {
      console.log('📷 Processing image upload for message');
      
      // Validate image data
      if (!req.body.image.startsWith('data:image/')) {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid image format' 
        });
      }
      
      // Check image size (approximate - base64 is ~33% larger than original)
      const imageSizeBytes = (req.body.image.length * 0.75);
      if (imageSizeBytes > 5 * 1024 * 1024) { // 5MB limit
        return res.status(400).json({ 
          success: false, 
          error: 'Image too large. Please use an image under 5MB.' 
        });
      }
      
      // Add image data to message
      messageData.image = req.body.image;
      messageData.imageName = req.body.imageName || 'image.jpg';
      messageData.imageSize = req.body.imageSize || imageSizeBytes;
      
      console.log('✅ Image data added to message:', {
        name: messageData.imageName,
        size: Math.round(imageSizeBytes / 1024) + 'KB'
      });
    }
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

app.post('/api/messages/:id/like', authenticateToken, async (req, res) => {
  try {
    const messageId = req.params.id;
    const userId = req.user.userId;
    
    const user = await User.findById(userId);
    const username = user ? `${user.firstName} ${user.lastName}` : 'User';
    
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }
    
    const existingLikeIndex = message.likes.findIndex(like => like.userId === userId);
    
    let action;
    if (existingLikeIndex > -1) {
      message.likes.splice(existingLikeIndex, 1);
      action = 'unliked';
    } else {
      message.likes.push({
        userId: userId,
        username: username,
        timestamp: new Date()
      });
      action = 'liked';
    }
    
    message.likeCount = message.likes.length;
    await message.save();
    
    console.log(`👍 Message ${action} by ${username}. New count: ${message.likeCount}`);
    
    res.json({
      success: true,
      action: action,
      likeCount: message.likeCount,
      isLiked: action === 'liked',
      messageId: messageId
    });
    
  } catch (error) {
    console.error('❌ Error toggling like:', error);
    res.status(500).json({ success: false, message: 'Failed to toggle like' });
  }
});

// ==========================================
// PERSONALITY TEST API ROUTES
// ==========================================

// Personality Test Schema
const personalityTestSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  answers: [{
    questionId: Number,
    selectedOption: String,
    type: String
  }],
  results: {
    allScores: Object,
    topThree: Array,
    totalQuestions: Number,
    completedAt: { type: Date, default: Date.now }
  },
  retakeCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const PersonalityTest = mongoose.model('PersonalityTest', personalityTestSchema);

// Save personality test results
app.post('/api/personality-test/results', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { answers, results } = req.body;
    
    if (!answers || !results) {
      return res.status(400).json({ error: 'Answers and results are required' });
    }
    
    // Check if user already has results
    let existingTest = await PersonalityTest.findOne({ userId });
    
    if (existingTest) {
      // Update existing results (retake)
      existingTest.answers = answers;
      existingTest.results = results;
      existingTest.retakeCount += 1;
      existingTest.updatedAt = new Date();
      await existingTest.save();
      
      res.json({
        message: 'Personality test results updated successfully',
        results: existingTest,
        isRetake: true
      });
    } else {
      // Create new results
      const newTest = new PersonalityTest({
        userId,
        answers,
        results,
        retakeCount: 0
      });
      
      await newTest.save();
      
      // Create notification for completion
      try {
        const notification = new Notification({
          userId,
          type: 'system',
          title: '🎯 Personality Assessment Complete!',
          content: `You've discovered your top personality traits: ${results.topThree.map(([type]) => type).join(', ')}`,
          priority: 'high'
        });
        await notification.save();
      } catch (notifError) {
        console.error('Error creating personality test notification:', notifError);
      }
      
      res.json({
        message: 'Personality test results saved successfully',
        results: newTest,
        isRetake: false
      });
    }
  } catch (error) {
    console.error('Save personality test results error:', error);
    res.status(500).json({ error: 'Failed to save results' });
  }
});

// Get personality test results
app.get('/api/personality-test/results', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const test = await PersonalityTest.findOne({ userId });
    
    if (!test) {
      return res.status(404).json({ error: 'No personality test results found' });
    }
    
    res.json(test);
  } catch (error) {
    console.error('Get personality test results error:', error);
    res.status(500).json({ error: 'Failed to get results' });
  }
});

// Delete personality test results (for retaking)
app.delete('/api/personality-test/results', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    await PersonalityTest.findOneAndDelete({ userId });
    
    res.json({ message: 'Personality test results deleted successfully' });
  } catch (error) {
    console.error('Delete personality test results error:', error);
    res.status(500).json({ error: 'Failed to delete results' });
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
      exportData.goals = goals;
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
          title: 'Daily Prompt Completed!',
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

// ==========================================
// DAILY PROGRESS API ROUTES - NEW
// ==========================================

// Get daily progress for a specific date or date range
app.get('/api/daily-progress', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { date, startDate, endDate } = req.query;

    let query = { userId };

    if (date) {
      // Single date
      query.date = date;
    } else if (startDate && endDate) {
      // Date range
      query.date = { $gte: startDate, $lte: endDate };
    } else {
      // Default to last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const startDateStr = thirtyDaysAgo.toISOString().split('T')[0];
      const endDateStr = new Date().toISOString().split('T')[0];
      query.date = { $gte: startDateStr, $lte: endDateStr };
    }

    const progressRecords = await DailyProgress.find(query)
      .populate('goalProgress.goalId', 'area bigGoal dailyAction')
      .sort({ date: -1 });

    res.json(progressRecords);

  } catch (error) {
    console.error('Get daily progress error:', error);
    res.status(500).json({ error: 'Failed to get daily progress' });
  }
});

// Save/Update daily progress
app.post('/api/daily-progress', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { date, goalId, completed, area } = req.body;

    if (!date || !goalId || completed === undefined || !area) {
      return res.status(400).json({ error: 'Date, goalId, completed status, and area are required' });
    }

    // Find or create daily progress record
    let dailyProgress = await DailyProgress.findOne({ userId, date });

    if (!dailyProgress) {
      // Create new daily progress record
      dailyProgress = new DailyProgress({
        userId,
        date,
        goalProgress: [],
        totalGoals: 0,
        completedGoals: 0,
        completionPercentage: 0
      });
    }

    // Find existing goal progress or create new
    let goalProgressIndex = dailyProgress.goalProgress.findIndex(
      gp => gp.goalId.toString() === goalId
    );

    if (goalProgressIndex === -1) {
      // Add new goal progress
      dailyProgress.goalProgress.push({
        goalId,
        completed,
        completedAt: completed ? new Date() : null,
        area
      });
    } else {
      // Update existing goal progress
      dailyProgress.goalProgress[goalProgressIndex].completed = completed;
      dailyProgress.goalProgress[goalProgressIndex].completedAt = completed ? new Date() : null;
    }

    // Recalculate totals
    const completedCount = dailyProgress.goalProgress.filter(gp => gp.completed).length;
    const totalCount = dailyProgress.goalProgress.length;

    dailyProgress.completedGoals = completedCount;
    dailyProgress.totalGoals = totalCount;
    dailyProgress.completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    dailyProgress.updatedAt = new Date();

    await dailyProgress.save();

    // Also update the goal's streak in the life-goals collection
    try {
      const goal = await LifeGoal.findById(goalId);
      if (goal) {
        if (completed) {
          // Task completed - increment streak
          goal.streak = (goal.streak || 0) + 1;
          goal.lastCompletedDate = new Date();
        } else {
          // Task uncompleted - decrement streak
          goal.streak = Math.max(0, (goal.streak || 0) - 1);
        }
        await goal.save();
      }
    } catch (goalError) {
      console.error('Error updating goal streak:', goalError);
    }

    res.json({
      message: 'Daily progress updated successfully',
      progress: dailyProgress
    });

  } catch (error) {
    console.error('Save daily progress error:', error);
    res.status(500).json({ error: 'Failed to save daily progress' });
  }
});

// Get progress summary for dashboard
app.get('/api/daily-progress/summary', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const today = new Date().toISOString().split('T')[0];

    // Get today's progress
    const todayProgress = await DailyProgress.findOne({ userId, date: today });

    // Get last 7 days for weekly streak calculation
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const startDate = sevenDaysAgo.toISOString().split('T')[0];

    const weeklyProgress = await DailyProgress.find({
      userId,
      date: { $gte: startDate, $lte: today }
    }).sort({ date: -1 });

    // Calculate weekly streak (consecutive days with at least one completed task)
    let weeklyStreak = 0;
    for (const dayProgress of weeklyProgress) {
      if (dayProgress.completedGoals > 0) {
        weeklyStreak++;
      } else {
        break;
      }
    }

    // Get total goals count
    const totalGoals = await LifeGoal.countDocuments({ userId });

    res.json({
      today: {
        totalTasks: todayProgress?.totalGoals || 0,
        completed: todayProgress?.completedGoals || 0,
        percentage: todayProgress?.completionPercentage || 0
      },
      weeklyStreak,
      totalGoals,
      weeklyProgress: weeklyProgress.map(wp => ({
        date: wp.date,
        completed: wp.completedGoals,
        total: wp.totalGoals,
        percentage: wp.completionPercentage
      }))
    });

  } catch (error) {
    console.error('Get progress summary error:', error);
    res.status(500).json({ error: 'Failed to get progress summary' });
  }
});

// ==========================================
// LIFE GOALS API ROUTES - NEW
// ==========================================

app.get('/api/life-goals', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const goals = await LifeGoal.find({ userId }).sort({ createdAt: -1 });
    res.json(goals);
  } catch (error) {
    console.error('Get life goals error:', error);
    res.status(500).json({ error: 'Failed to get life goals' });
  }
});

app.post('/api/life-goals', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { area, bigGoal, dailyAction } = req.body;

    if (!area || !bigGoal || !dailyAction) {
      return res.status(400).json({ error: 'Area, big goal, and daily action are required' });
    }

    const goal = new LifeGoal({
      userId,
      area,
      bigGoal,
      dailyAction,
      streak: 0
    });

    await goal.save();
    res.json(goal);

  } catch (error) {
    console.error('Create life goal error:', error);
    res.status(500).json({ error: 'Failed to create life goal' });
  }
});

app.put('/api/life-goals/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const goalId = req.params.id;
    const updateData = req.body;

    const goal = await LifeGoal.findOneAndUpdate(
      { _id: goalId, userId },
      { ...updateData, updatedAt: new Date() },
      { new: true }
    );

    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    res.json(goal);

  } catch (error) {
    console.error('Update life goal error:', error);
    res.status(500).json({ error: 'Failed to update life goal' });
  }
});

app.delete('/api/life-goals/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const goalId = req.params.id;

    const goal = await LifeGoal.findOneAndDelete({ _id: goalId, userId });

    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    // Also delete any daily progress records for this goal
    await DailyProgress.updateMany(
      { userId },
      { $pull: { goalProgress: { goalId } } }
    );

    res.json({ message: 'Goal deleted successfully' });

  } catch (error) {
    console.error('Delete life goal error:', error);
    res.status(500).json({ error: 'Failed to delete life goal' });
  }
});


// ==========================================
// BILLING MANAGEMENT ENDPOINTS
// ==========================================

// Get customer billing info
app.get('/api/billing/customer', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user || !user.stripeCustomerId) {
      return res.status(404).json({ error: 'No billing information found' });
    }
    
    // Get customer from Stripe
    const customer = await stripe.customers.retrieve(user.stripeCustomerId);
    
    // Get subscription if exists
    let subscription = null;
    if (user.subscription?.stripeSubscriptionId) {
      subscription = await stripe.subscriptions.retrieve(user.subscription.stripeSubscriptionId);
    }
    
    // Get payment methods
    const paymentMethods = await stripe.paymentMethods.list({
      customer: user.stripeCustomerId,
      type: 'card',
    });
    
    res.json({
      customer,
      subscription,
      paymentMethods: paymentMethods.data,
      localSubscription: user.subscription
    });
    
  } catch (error) {
    console.error('Get billing info error:', error);
    res.status(500).json({ error: 'Failed to get billing information' });
  }
});

// Cancel subscription
app.post('/api/billing/cancel-subscription', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user || !user.subscription?.stripeSubscriptionId) {
      return res.status(404).json({ error: 'No active subscription found' });
    }
    
    // Cancel subscription at period end
    const subscription = await stripe.subscriptions.update(
      user.subscription.stripeSubscriptionId,
      { cancel_at_period_end: true }
    );
    
    res.json({ 
      success: true, 
      message: 'Subscription will be canceled at the end of the current period',
      cancelAt: new Date(subscription.cancel_at * 1000)
    });
    
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

// Get invoices
app.get('/api/billing/invoices', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user || !user.stripeCustomerId) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    const invoices = await stripe.invoices.list({
      customer: user.stripeCustomerId,
      limit: 20,
    });
    
    res.json(invoices.data);
    
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({ error: 'Failed to get invoices' });
  }
});



// ADD THE NEW BILLING ROUTES HERE:

// Reactivate subscription
app.post('/api/billing/reactivate-subscription', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user || !user.subscription?.stripeSubscriptionId) {
      return res.status(404).json({ error: 'No subscription found' });
    }
    
    // Remove the cancel_at_period_end flag
    const subscription = await stripe.subscriptions.update(
      user.subscription.stripeSubscriptionId,
      { cancel_at_period_end: false }
    );
    
    res.json({ 
      success: true, 
      message: 'Subscription reactivated successfully'
    });
    
  } catch (error) {
    console.error('Reactivate subscription error:', error);
    res.status(500).json({ error: 'Failed to reactivate subscription' });
  }
});

// Update payment method
app.post('/api/billing/update-payment-method', authenticateToken, async (req, res) => {
  try {
    const { paymentMethodId } = req.body;
    const user = await User.findById(req.user.userId);
    
    if (!user || !user.stripeCustomerId) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    // Attach payment method to customer
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: user.stripeCustomerId,
    });
    
    // Set as default payment method
    await stripe.customers.update(user.stripeCustomerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });
    
    // Update subscription's default payment method if exists
    if (user.subscription?.stripeSubscriptionId) {
      await stripe.subscriptions.update(user.subscription.stripeSubscriptionId, {
        default_payment_method: paymentMethodId,
      });
    }
    
    res.json({ success: true, message: 'Payment method updated successfully' });
    
  } catch (error) {
    console.error('Update payment method error:', error);
    res.status(500).json({ error: 'Failed to update payment method' });
  }
});

// Download invoice
app.get('/api/billing/invoice/:invoiceId/download', authenticateToken, async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const user = await User.findById(req.user.userId);
    
    if (!user || !user.stripeCustomerId) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    // Get invoice from Stripe
    const invoice = await stripe.invoices.retrieve(invoiceId);
    
    // Verify this invoice belongs to this customer
    if (invoice.customer !== user.stripeCustomerId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json({ 
      downloadUrl: invoice.hosted_invoice_url,
      invoicePdf: invoice.invoice_pdf
    });
    
  } catch (error) {
    console.error('Download invoice error:', error);
    res.status(500).json({ error: 'Failed to get invoice download link' });
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
      messageDeleting: 'enabled',
      manualSeedEndpoint: 'enabled'
    }
  });
});

// ==========================================
// ADMIN ROUTES - ADD THESE RIGHT AFTER THE HEALTH CHECK
// ==========================================

// Admin authentication middleware
const authenticateAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      console.log('❌ No admin token provided');
      return res.status(401).json({ message: 'Admin access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    console.log('🔍 Admin token decoded:', decoded.email);
    
    if (decoded.isAdmin === true) {
      req.user = decoded;
      console.log('✅ Admin authenticated successfully');
      next();
    } else {
      console.log('❌ User is not admin');
      return res.status(403).json({ message: 'Admin access required' });
    }
  } catch (error) {
    console.error('❌ Admin auth error:', error.message);
    return res.status(403).json({ message: 'Invalid admin token' });
  }
};

// ADD THESE ROUTES RIGHT AFTER THE authenticateAdmin FUNCTION

// Test route (no auth needed)
app.get('/api/admin/test', (req, res) => {
  console.log('✅ Admin test route accessed');
  res.json({ 
    message: 'Admin routes are working!', 
    timestamp: new Date().toISOString() 
  });
});

// Admin login
app.post('/api/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('🔐 Admin login attempt for:', email);
    
const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;

if (!adminEmail || !adminPassword) {
  console.error('❌ Admin credentials not configured in environment variables');
  return res.status(500).json({ message: 'Admin login not configured' });
}
    
    if (email === adminEmail && password === adminPassword) {
      const token = jwt.sign(
        { userId: 'admin', email: adminEmail, isAdmin: true },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );
      
      console.log('✅ Admin login successful');
      res.json({
        message: 'Admin login successful',
        token,
        user: { email: adminEmail, role: 'admin' }
      });
    } else {
      console.log('❌ Invalid admin credentials');
      res.status(401).json({ message: 'Invalid admin credentials' });
    }
  } catch (error) {
    console.error('❌ Admin login error:', error);
    res.status(500).json({ message: 'Admin login failed' });
  }
});

// Get stats
app.get('/api/admin/stats', authenticateAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const paidUsers = await User.countDocuments({
      'subscription.plan': { $in: ['monthly', 'yearly'] },
      'subscription.status': 'active'
    });
    const freeUsers = totalUsers - paidUsers;
    
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const newUsers = await User.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });

    res.json({
      totalUsers,
      paidUsers,
      freeUsers,
      newUsersLast30Days: newUsers
    });
  } catch (error) {
    console.error('❌ Admin stats error:', error);
    res.status(500).json({ message: 'Failed to get stats' });
  }
});

// Get users
app.get('/api/admin/users', authenticateAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 25, search = '' } = req.query;

    let query = {};
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select('firstName lastName email subscription.plan subscription.status createdAt streakData.lastLoginDate')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const userData = users.map(user => ({
      id: user._id,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      plan: user.subscription?.plan || 'free',
      status: user.subscription?.status || 'inactive',
      memberSince: user.createdAt,
      lastLogin: user.streakData?.lastLoginDate || user.createdAt,
      daysSinceMember: Math.floor((new Date() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24))
    }));

    res.json({
      users: userData,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    console.error('❌ Admin get users error:', error);
    res.status(500).json({ message: 'Failed to get users' });
  }
});

// Delete user
app.delete('/api/admin/users/:id', authenticateAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await Promise.all([
      User.findByIdAndDelete(userId),
      LifeGoal.deleteMany({ userId }),
      Chat.deleteMany({ userId }),
      Notification.deleteMany({ userId }),
      Message.deleteMany({ userId: userId.toString() }),
      DailyPromptResponse.deleteMany({ userId }),
      DailyProgress.deleteMany({ userId }),
      Insight.deleteMany({ userId })
    ]);

    res.json({ 
      message: 'User deleted successfully',
      deletedUser: {
        name: `${user.firstName} ${user.lastName}`,
        email: user.email
      }
    });
  } catch (error) {
    console.error('❌ Admin delete user error:', error);
    res.status(500).json({ message: 'Failed to delete user' });
  }
});

console.log('✅ Admin routes loaded successfully');

// ==========================================
// ENHANCED ADMIN COUPON MANAGEMENT ROUTES - ADD TO server.js
// ==========================================

// Get all coupons from Stripe
app.get('/api/admin/coupons', authenticateAdmin, async (req, res) => {
  try {
    console.log('🎫 Fetching all coupons from Stripe...');
    
    // Get coupons from Stripe
    const stripeCoupons = await stripe.coupons.list({
      limit: 100
    });
    
    // Get local coupon usage stats
    const localCouponStats = await User.aggregate([
      {
        $match: {
          'subscription.couponUsed': { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: '$subscription.couponUsed',
          usageCount: { $sum: 1 },
          users: {
            $push: {
              name: { $concat: ['$firstName', ' ', '$lastName'] },
              email: '$email',
              createdAt: '$createdAt'
            }
          }
        }
      }
    ]);
    
    // Combine Stripe data with local usage
    const enhancedCoupons = stripeCoupons.data.map(stripeCoupon => {
      const localStats = localCouponStats.find(stat => stat._id === stripeCoupon.id) || {};
      
      return {
        id: stripeCoupon.id,
        name: stripeCoupon.name || stripeCoupon.id,
        percentOff: stripeCoupon.percent_off,
        amountOff: stripeCoupon.amount_off,
        currency: stripeCoupon.currency,
        duration: stripeCoupon.duration,
        durationInMonths: stripeCoupon.duration_in_months,
        maxRedemptions: stripeCoupon.max_redemptions,
        timesRedeemed: stripeCoupon.times_redeemed,
        valid: stripeCoupon.valid,
        created: new Date(stripeCoupon.created * 1000),
        redeemBy: stripeCoupon.redeem_by ? new Date(stripeCoupon.redeem_by * 1000) : null,
        localUsage: localStats.usageCount || 0,
        localUsers: localStats.users || []
      };
    });
    
    console.log(`✅ Found ${enhancedCoupons.length} coupons`);
    
    res.json({
      coupons: enhancedCoupons,
      total: enhancedCoupons.length
    });
    
  } catch (error) {
    console.error('❌ Error fetching coupons:', error);
    res.status(500).json({ 
      error: 'Failed to fetch coupons',
      message: error.message 
    });
  }
});

// Create new coupon
app.post('/api/admin/coupons', authenticateAdmin, async (req, res) => {
  try {
    const {
      id,
      name,
      percentOff,
      amountOff,
      currency,
      duration,
      durationInMonths,
      maxRedemptions,
      redeemBy
    } = req.body;
    
    console.log('🎫 Creating new coupon:', { id, name, percentOff, amountOff });
    
    if (!id) {
      return res.status(400).json({ error: 'Coupon ID is required' });
    }
    
    if (!percentOff && !amountOff) {
      return res.status(400).json({ error: 'Either percent_off or amount_off is required' });
    }
    
    // Prepare coupon data for Stripe
    const couponData = {
      id: id.toUpperCase(),
      name: name || id,
      duration: duration || 'once'
    };
    
    // Add discount type
    if (percentOff) {
      couponData.percent_off = parseInt(percentOff);
    } else if (amountOff) {
      couponData.amount_off = parseInt(amountOff * 100); // Convert to cents
      couponData.currency = currency || 'usd';
    }
    
    // Add optional fields
    if (durationInMonths && duration === 'repeating') {
      couponData.duration_in_months = parseInt(durationInMonths);
    }
    
    if (maxRedemptions) {
      couponData.max_redemptions = parseInt(maxRedemptions);
    }
    
    if (redeemBy) {
      couponData.redeem_by = Math.floor(new Date(redeemBy).getTime() / 1000);
    }
    
    // Create coupon in Stripe
    const stripeCoupon = await stripe.coupons.create(couponData);
    
    console.log('✅ Coupon created successfully:', stripeCoupon.id);
    
    res.json({
      message: 'Coupon created successfully',
      coupon: {
        id: stripeCoupon.id,
        name: stripeCoupon.name,
        percentOff: stripeCoupon.percent_off,
        amountOff: stripeCoupon.amount_off,
        currency: stripeCoupon.currency,
        duration: stripeCoupon.duration,
        durationInMonths: stripeCoupon.duration_in_months,
        maxRedemptions: stripeCoupon.max_redemptions,
        valid: stripeCoupon.valid,
        created: new Date(stripeCoupon.created * 1000)
      }
    });
    
  } catch (error) {
    console.error('❌ Error creating coupon:', error);
    
    if (error.type === 'StripeInvalidRequestError') {
      res.status(400).json({ 
        error: 'Invalid coupon data',
        message: error.message 
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to create coupon',
        message: error.message 
      });
    }
  }
});

// Delete coupon
app.delete('/api/admin/coupons/:id', authenticateAdmin, async (req, res) => {
  try {
    const couponId = req.params.id;
    
    console.log('🗑️ Deleting coupon:', couponId);
    
    const deletedCoupon = await stripe.coupons.del(couponId);
    
    console.log('✅ Coupon deleted successfully');
    
    res.json({
      message: 'Coupon deleted successfully',
      couponId: couponId,
      deleted: deletedCoupon.deleted
    });
    
  } catch (error) {
    console.error('❌ Error deleting coupon:', error);
    res.status(500).json({ 
      error: 'Failed to delete coupon',
      message: error.message 
    });
  }
});

// Get coupon usage analytics
app.get('/api/admin/coupons/:id/analytics', authenticateAdmin, async (req, res) => {
  try {
    const couponId = req.params.id;
    
    console.log('📊 Getting analytics for coupon:', couponId);
    
    // Get Stripe coupon data
    const stripeCoupon = await stripe.coupons.retrieve(couponId);
    
    // Get local usage data
    const usageData = await User.find({
      'subscription.couponUsed': couponId
    }).select('firstName lastName email subscription.plan subscription.status createdAt');
    
    // Calculate analytics
    const analytics = {
      stripeData: {
        timesRedeemed: stripeCoupon.times_redeemed,
        maxRedemptions: stripeCoupon.max_redemptions,
        valid: stripeCoupon.valid
      },
      localUsage: {
        totalUsers: usageData.length,
        usersByPlan: usageData.reduce((acc, user) => {
          const plan = user.subscription?.plan || 'free';
          acc[plan] = (acc[plan] || 0) + 1;
          return acc;
        }, {}),
        recentUsers: usageData
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 10)
          .map(user => ({
            name: `${user.firstName} ${user.lastName}`,
            email: user.email,
            plan: user.subscription?.plan || 'free',
            status: user.subscription?.status || 'inactive',
            signupDate: user.createdAt
          }))
      }
    };
    
    res.json(analytics);
    
  } catch (error) {
    console.error('❌ Error getting coupon analytics:', error);
    res.status(500).json({ 
      error: 'Failed to get analytics',
      message: error.message 
    });
  }
});

console.log('✅ Enhanced admin coupon management routes loaded successfully');

// Clean up old images (optional - run manually or via cron)
app.post('/api/admin/cleanup-images', authenticateAdmin, async (req, res) => {
  try {
    const { daysOld = 30 } = req.body;
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
    
    console.log(`🧹 Cleaning up images older than ${daysOld} days`);
    
    // Find messages with images older than cutoff date
    const oldMessages = await Message.find({
      image: { $exists: true },
      createdAt: { $lt: cutoffDate },
      deleted: true
    });
    
    console.log(`📊 Found ${oldMessages.length} old deleted messages with images`);
    
    // Remove image data from old deleted messages
    const result = await Message.updateMany(
      {
        image: { $exists: true },
        createdAt: { $lt: cutoffDate },
        deleted: true
      },
      {
        $unset: { 
          image: 1, 
          imageName: 1, 
          imageSize: 1 
        }
      }
    );
    
    res.json({
      success: true,
      message: `Cleaned up ${result.modifiedCount} old images`,
      messagesProcessed: oldMessages.length
    });
    
  } catch (error) {
    console.error('❌ Error cleaning up images:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to cleanup images' 
    });
  }
});

// ADD THIS ROUTE TO YOUR server.js file after the other admin routes
// (around line 2200, after the other admin coupon routes)

// Get overall admin analytics
app.get('/api/admin/analytics', authenticateAdmin, async (req, res) => {
  try {
    console.log('📊 Getting overall admin analytics...');
    
    // User stats
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({
      'streakData.lastLoginDate': { 
        $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) 
      }
    });
    
    // Subscription stats
    const subscriptionStats = await User.aggregate([
      {
        $group: {
          _id: '$subscription.plan',
          count: { $sum: 1 },
          activeCount: {
            $sum: {
              $cond: [
                { $eq: ['$subscription.status', 'active'] },
                1,
                0
              ]
            }
          }
        }
      }
    ]);
    
    // Coupon usage stats
    const couponStats = await User.aggregate([
      {
        $match: {
          'subscription.couponUsed': { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: '$subscription.couponUsed',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);
    
    // Recent signups
    const recentSignups = await User.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select('firstName lastName email subscription createdAt');
    
    // Revenue estimation (based on active subscriptions)
    const revenueData = await User.aggregate([
      {
        $match: {
          'subscription.status': 'active',
          'subscription.plan': { $in: ['monthly', 'yearly'] }
        }
      },
      {
        $group: {
          _id: '$subscription.plan',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const monthlyRevenue = (revenueData.find(r => r._id === 'monthly')?.count || 0) * 247;
    const yearlyRevenue = (revenueData.find(r => r._id === 'yearly')?.count || 0) * 2497;
    const estimatedMonthlyRevenue = monthlyRevenue + (yearlyRevenue / 12);
    
    res.json({
      users: {
        total: totalUsers,
        active: activeUsers,
        recentSignups: recentSignups.map(user => ({
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          plan: user.subscription?.plan || 'free',
          signupDate: user.createdAt
        }))
      },
      subscriptions: subscriptionStats,
      coupons: couponStats,
      revenue: {
        estimatedMonthlyRevenue,
        monthlySubscriptions: revenueData.find(r => r._id === 'monthly')?.count || 0,
        yearlySubscriptions: revenueData.find(r => r._id === 'yearly')?.count || 0
      }
    });
    
  } catch (error) {
    console.error('❌ Error getting admin analytics:', error);
    res.status(500).json({ 
      error: 'Failed to get analytics',
      message: error.message 
    });
  }
});

console.log('✅ Admin analytics route loaded successfully');

// ENHANCED ADMIN DASHBOARD HTML
// Replace your existing admin-dashboard.html with this enhanced version:

// ENHANCED ADMIN DASHBOARD HTML
// Replace your existing admin-dashboard.html with this enhanced version:

// Fix MongoDB index issue permanently
app.get('/api/admin/fix-mongodb-indexes', async (req, res) => {
  try {
    console.log('🔧 Fixing MongoDB indexes...');
    
    // Drop the problematic id_1 index
    try {
      await User.collection.dropIndex('id_1');
      console.log('✅ Dropped problematic id_1 index');
    } catch (dropError) {
      console.log('ℹ️ id_1 index not found or already dropped');
    }
    
    // Ensure only the proper indexes exist
    await User.collection.createIndex({ email: 1 }, { unique: true });
    console.log('✅ Recreated email index');
    
    // List all indexes to confirm
    const indexes = await User.collection.indexes();
    console.log('📋 Current indexes:', indexes);
    
    res.json({ 
      message: 'MongoDB indexes fixed successfully',
      indexes: indexes
    });
    
  } catch (error) {
    console.error('❌ Index fix error:', error);
    res.status(500).json({ error: 'Failed to fix indexes' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔑 JWT Secret: ${process.env.JWT_SECRET ? 'configured' : 'using default'}`);
  console.log(`🤖 OpenAI Assistant: ${openai ? 'ready (asst_tpShoq1kPGvtcFhMdxb6EmYg)' : 'disabled'}`);
  console.log(`💳 Stripe: ${process.env.STRIPE_SECRET_KEY ? 'ready' : 'not configured'}`);
  console.log(`📧 Email: ${transporter ? 'ready' : 'not configured'}`);
  console.log(`💾 Database Storage: Goals ✅ Notifications ✅ Chat Rooms ✅`);
  console.log(`💬 Enhanced Reply System: ENABLED with Notifications ✅`);
  console.log(`🗑️ Message Deletion: ENABLED with Permanent Server Deletion ✅`);
  console.log(`🌱 Manual Seed Endpoint: /api/manual-seed-prompts ✅`);
});


// Temporary database cleanup endpoint for testing
app.post('/api/admin/reset-test-db', async (req, res) => {
  try {
    console.log('🧹 RESETTING TEST DATABASE...');
    
    // Delete all data
    await User.deleteMany({});
    await LifeGoal.deleteMany({});
    await Chat.deleteMany({});
    await Notification.deleteMany({});
    await Message.deleteMany({});
    await DailyPromptResponse.deleteMany({});
    await DailyProgress.deleteMany({});
    await Insight.deleteMany({});
    
    console.log('✅ All test data deleted');
    
    res.json({ 
      message: 'Test database reset successfully',
      warning: 'All test data has been deleted'
    });
    
  } catch (error) {
    console.error('❌ Reset error:', error);
    res.status(500).json({ error: 'Failed to reset database' });
  }
// Admin analytics endpoint - ADD THIS NEW SECTION
app.get('/api/admin/analytics', authenticateAdmin, async (req, res) => {
  try {
    console.log('📊 Loading admin analytics...');
    
    // Get user statistics
    const totalUsers = await User.countDocuments();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const activeUsers = await User.countDocuments({
      'streakData.lastLoginDate': { $gte: thirtyDaysAgo }
    });
    
    // Get recent signups
    const recentSignups = await User.find({
      createdAt: { $gte: thirtyDaysAgo }
    })
    .select('firstName lastName email subscription.plan createdAt')
    .sort({ createdAt: -1 })
    .limit(10);
    
    // Get subscription breakdown
    const subscriptionStats = await User.aggregate([
      {
        $group: {
          _id: '$subscription.plan',
          count: { $sum: 1 },
          activeCount: {
            $sum: {
              $cond: [
                { $eq: ['$subscription.status', 'active'] },
                1,
                0
              ]
            }
          }
        }
      }
    ]);
    
    // Get coupon usage stats
    const couponStats = await User.aggregate([
      {
        $match: {
          'subscription.couponUsed': { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: '$subscription.couponUsed',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);
    
    // Calculate revenue estimates
    const monthlyUsers = subscriptionStats.find(s => s._id === 'monthly')?.activeCount || 0;
    const yearlyUsers = subscriptionStats.find(s => s._id === 'yearly')?.activeCount || 0;
    
    // Assuming monthly = $29, yearly = $249 (adjust to your actual prices)
    const monthlyRevenue = (monthlyUsers * 29) + (yearlyUsers * 249 / 12);
    
    const analytics = {
      users: {
        total: totalUsers,
        active: activeUsers,
        recentSignups: recentSignups.map(user => ({
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          plan: user.subscription?.plan || 'free',
          signupDate: user.createdAt
        }))
      },
      subscriptions: subscriptionStats,
      coupons: couponStats,
      revenue: {
        monthlySubscriptions: monthlyUsers,
        yearlySubscriptions: yearlyUsers,
        estimatedMonthlyRevenue: monthlyRevenue
      }
    };
    
    console.log('✅ Analytics loaded successfully');
    res.json(analytics);
    
  } catch (error) {
    console.error('❌ Error loading analytics:', error);
    res.status(500).json({ 
      error: 'Failed to load analytics',
      message: error.message 
    });
  }
});
    
});

