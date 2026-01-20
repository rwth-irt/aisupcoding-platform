const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const authenticateToken = require('./authMiddleware');

const app = express();
const PORT = 5001;

// --- Config and Secrets ---
const corsOptions = { origin: process.env.CORS_OPTION };
app.use(cors(corsOptions));
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET;
const dbURI = process.env.MONGO_URI; 

if (!JWT_SECRET || !dbURI) {
  throw new Error('FATAL_ERROR: JWT_SECRET or MONGO_URI is not defined.');
}

// --- MongoDB Connection ---
mongoose.connect(dbURI)
  .then(() => console.log('MongoDB connected to database'))
  .catch(err => console.log('MongoDB connection error:', err));


// --- Schemas ---

// Prompt schema
const promptSchema = new mongoose.Schema({
  TaskIdentifier: { type: String, required: true, unique: true },
  SampleSolution: { type: String, default: '' },
  ExerciseTemplate: { type: String, default: '' },
  ExerciseContext: { type: String, default: '' },
  AdditionalInformation: { type: String, default: '' },
  AdditionalRules: { type: String, default: '' },
  ProblemDescription: { type: String, default: '' },
  AcceptedLoss: { type: Number, default: 0.1 },
  TemplateId: { type: Number, default: 1 } 
});
const Prompt = mongoose.model('Prompt', promptSchema);

// Template schema
const promptTemplateSchema = new mongoose.Schema({
  TemplateId: { type: Number, required: true, unique: true },
  Template: { type: String, default: '' }
});
const PromptTemplate = mongoose.model('PromptTemplate', promptTemplateSchema, 'promptTemplate');

// USER SCHEMA
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  isApproved: { type: Boolean, default: false }
});
const User = mongoose.model('User', userSchema);

// --- ANALYTICS SCHEMAS ---
const figureRequestSchema = new mongoose.Schema({ time: String }, { collection: 'figures', strict: false });
const FigureRequest = mongoose.model('FigureRequest', figureRequestSchema);

const llmRequestSchema = new mongoose.Schema({ time: String }, { collection: 'llms', strict: false });
const LlmRequest = mongoose.model('LlmRequest', llmRequestSchema);

const feedbackRequestSchema = new mongoose.Schema({ time: String }, { collection: 'feedbacks', strict: false });
const FeedbackRequest = mongoose.model('FeedbackRequest', feedbackRequestSchema);


app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).send('Username and password are required.');
    }
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).send('Username already taken.');
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const user = new User({ username, password: hashedPassword });
    await user.save();
    res.status(201).send('User created successfully. Account is pending approval.');
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: 'Invalid username or password.' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid username or password.' });
    }
    if (!user.isApproved) {
      return res.status(403).json({ message: 'Account is pending approval. Please contact an administrator.' });
    }
    const payload = { id: user._id, username: user.username };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' }); 
    res.json({ token });
  } catch (err) {
    res.status(500).send(err.message);
  }
});


// --- Data Endpoints ---
app.get('/api/prompts/list', authenticateToken, async (req, res) => {
  try {
    const prompts = await Prompt.find().select('TaskIdentifier _id');
    res.json(prompts);
  } catch (err) {
    res.status(500).send(err);
  }
});

// POST: Create a new prompt
app.post('/api/prompts', authenticateToken, async (req, res) => {
  try {
    const { TaskIdentifier } = req.body;
    if (!TaskIdentifier) {
      return res.status(400).json({ message: 'TaskIdentifier is required.' });
    }
    const existing = await Prompt.findOne({ TaskIdentifier });
    if (existing) {
      return res.status(400).json({ message: 'TaskIdentifier already exists.' });
    }
    const newPrompt = new Prompt({ TaskIdentifier });
    await newPrompt.save();
    res.status(201).json(newPrompt);
  } catch (err) {
    res.status(500).send(err);
  }
});

app.get('/api/prompt/:taskIdentifier', authenticateToken, async (req, res) => {
  try {
    const { taskIdentifier } = req.params;
    const prompt = await Prompt.findOne({ TaskIdentifier: taskIdentifier });
    if (!prompt) {
      return res.status(44).json({ message: 'Prompt not found.' });
    }
    res.json(prompt);
  } catch (err) {
    res.status(500).send(err);
  }
});

// PUT: Update a prompt
app.put('/api/prompt/:taskIdentifier', authenticateToken, async (req, res) => {
  try {
    const { taskIdentifier } = req.params;
    const updatedData = req.body; 
    delete updatedData._id; 
    delete updatedData.TaskIdentifier; 
    
    // Convert AcceptedLoss
    if (updatedData.AcceptedLoss) {
        updatedData.AcceptedLoss = parseFloat(updatedData.AcceptedLoss);
    }
    
    // TemplateId will be passed in updatedData and saved automatically
    if (updatedData.TemplateId) {
        updatedData.TemplateId = parseInt(updatedData.TemplateId);
    }

    const updatedPrompt = await Prompt.findOneAndUpdate(
      { TaskIdentifier: taskIdentifier }, 
      updatedData,                       
      { new: true }                      
    );
    if (!updatedPrompt) {
      return res.status(404).send('Prompt not found');
    }
    res.json(updatedPrompt);
  } catch (err) {
    res.status(500).send(err);
  }
});

app.get('/api/prompt-template/:templateId', authenticateToken, async (req, res) => {
  try {
    const { templateId } = req.params;
    const template = await PromptTemplate.findOne({ TemplateId: templateId });
    if (!template) {
      return res.status(404).json({ message: 'Prompt Template not found.' });
    }
    res.json(template);
  } catch (err) {
    res.status(500).send(err);
  }
});

app.get('/api/prompt-templates/list', authenticateToken, async (req, res) => {
  try {
    const templates = await PromptTemplate.find().select('TemplateId _id').sort({ TemplateId: 1 });
    res.json(templates);
  } catch (err) {
    res.status(500).send(err);
  }
});

app.put('/api/prompt-template/:templateId', authenticateToken, async (req, res) => {
  try {
    const { templateId } = req.params;
    const { Template } = req.body;
    if (typeof Template === 'undefined') {
      return res.status(400).json({ message: 'Template content is required.' });
    }
    const updatedTemplate = await PromptTemplate.findOneAndUpdate(
      { TemplateId: templateId }, 
      { Template: Template },
      { new: true }
    );
    if (!updatedTemplate) {
      return res.status(404).send('Prompt Template not found');
    }
    res.json(updatedTemplate);
  } catch (err) {
    res.status(503).send(err);
  }
});


// --- ANALYTICS ---
async function getTimelineAggregation(model) {
  const threeHoursInMillis = 3 * 60 * 60 * 1000;
  const epochTime = new Date(0); 
  const pipeline = [
    // Filter out specific user ID (checking both string and number types)
    // NOTE: Ensure 'user_id' matches the field name in your MongoDB documents
    { 
        $match: { 
            studentId: { $nin: ["70000007", 70000007] } 
        } 
    },
    { $addFields: { requestTime: { $convert: { input: "$time", to: "date", onError: epochTime, onNull: epochTime } } } },
    { $match: { requestTime: { $ne: epochTime } } },
    { $group: { _id: { $toDate: { $subtract: [ { $toLong: "$requestTime" }, { $mod: [{ $toLong: "$requestTime" }, threeHoursInMillis] } ] } }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, startTime: "$_id", count: "$count" } }
  ];
  return model.aggregate(pipeline);
}

app.get('/api/analytics/figure-timeline', authenticateToken, async (req, res) => {
  try {
    const timelineData = await getTimelineAggregation(FigureRequest);
    res.json(timelineData);
  } catch (err) { res.status(500).send(err.message); }
});
app.get('/api/analytics/llm-timeline', authenticateToken, async (req, res) => {
  try {
    const timelineData = await getTimelineAggregation(LlmRequest);
    res.json(timelineData);
  } catch (err) { res.status(500).send(err.message); }
});
app.get('/api/analytics/feedback-timeline', authenticateToken, async (req, res) => {
  try {
    const timelineData = await getTimelineAggregation(FeedbackRequest);
    res.json(timelineData);
  } catch (err) { res.status(500).send(err.message); }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});