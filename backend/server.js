const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { OpenAI } = require('openai');
const pdfParse = require('pdf-parse');
require('dotenv').config();

const app = express();
const upload = multer();

// Add logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Configure CORS with specific options
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'https://mcq-gen-121-f69a8.web.app',
    'https://mcq-gen-121-f69a8.firebaseapp.com'
  ],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept', 'Authorization'],
  credentials: true
}));

// Add pre-flight handling
app.options('*', cors());

app.use(express.json());

// Add health check endpoint
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Store PDF chunks in memory (in production, use a proper database)
let pdfChunks = [];
let currentChunkIndex = 0;

// Extract text from PDF
async function extractTextFromPDF(buffer) {
  try {
    const data = await pdfParse(buffer);
    return data.text;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

// Split text into chunks
function splitTextIntoChunks(text, maxChunkLength = 2000) {
  const sentences = text.split(/[.!?]+/);
  const chunks = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > maxChunkLength) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += (currentChunk ? ' ' : '') + sentence;
    }
  }
  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }
  return chunks;
}

// Generate MCQs using OpenAI
async function generateMCQs(pdfText, options) {
  try {
    // Parse options if it's a string
    const parsedOptions = typeof options === 'string' ? JSON.parse(options) : options;
    
    // Limit the text length to avoid context length issues
    const limitedText = pdfText.slice(0, 8000);

    const prompt = `Generate ${parsedOptions.questionCount} multiple choice questions from the following text. 
    Difficulty level: ${parsedOptions.difficulty}
    Allow multiple correct answers: ${parsedOptions.multipleCorrect}
    
    Text:
    ${limitedText}
    
    Format each question as a JSON object with the following structure:
    {
      "question": "The question text",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "correctAnswers": [0], // Index of correct answer(s)
      "explanation": "Brief explanation of why this is the correct answer",
      "difficulty": "${parsedOptions.difficulty}",
      "multipleCorrect": ${parsedOptions.multipleCorrect}
    }
    
    Return an array of these question objects.`;

    let retries = 3;
    let lastError = null;

    while (retries > 0) {
      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3,
          max_tokens: 1000,
        });

        const response = completion.choices[0].message.content || '[]';
        const cleanedResponse = response.replace(/```json\n?|\n?```/g, '').trim();
        const questions = JSON.parse(cleanedResponse);

        if (!Array.isArray(questions)) {
          throw new Error('Response is not an array of questions');
        }

        // Add unique IDs to questions using timestamp and index
        return questions.map((q, index) => ({
          ...q,
          id: `q${Date.now()}-${index}`
        }));
      } catch (error) {
        lastError = error;
        if (error.code === 'rate_limit_exceeded' || error.code === 'context_length_exceeded') {
          console.log(`Rate limit or context length error, retrying in 60 seconds... (${retries} retries left)`);
          await new Promise(resolve => setTimeout(resolve, 60000));
          retries--;
        } else {
          throw error;
        }
      }
    }

    throw lastError || new Error('Failed to generate MCQs after multiple retries');
  } catch (error) {
    console.error('Error generating MCQs:', error);
    throw new Error('Failed to generate MCQs');
  }
}

// Handle initial MCQ generation endpoint
app.post('/generate-mcq', upload.single('file'), async (req, res) => {
  try {
    console.log('Received request:', {
      file: req.file ? 'File present' : 'No file',
      options: req.body.options
    });

    const file = req.file;
    const options = JSON.parse(req.body.options);

    if (!file || !options) {
      return res.status(400).json({ error: 'Missing required fields: file or options' });
    }

    const text = await extractTextFromPDF(file.buffer);
    pdfChunks = splitTextIntoChunks(text);
    currentChunkIndex = 0;

    const questions = await generateMCQs(pdfChunks[currentChunkIndex], options);

    res.json({
      questions,
      metadata: {
        totalQuestions: questions.length,
        difficulty: options.difficulty,
        generatedAt: new Date().toISOString(),
        hasMoreChunks: currentChunkIndex < pdfChunks.length - 1,
        currentChunk: currentChunkIndex + 1,
        totalChunks: pdfChunks.length
      },
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      error: error.message,
      details: error.stack
    });
  }
});

// Handle next batch of questions
app.post('/generate-next-batch', async (req, res) => {
  try {
    const options = req.body.options;
    
    if (!options) {
      return res.status(400).json({ error: 'Missing options' });
    }

    if (currentChunkIndex >= pdfChunks.length - 1) {
      return res.status(400).json({ error: 'No more chunks available' });
    }

    currentChunkIndex++;
    const questions = await generateMCQs(pdfChunks[currentChunkIndex], options);

    res.json({
      questions,
      metadata: {
        totalQuestions: questions.length,
        difficulty: options.difficulty,
        generatedAt: new Date().toISOString(),
        hasMoreChunks: currentChunkIndex < pdfChunks.length - 1,
        currentChunk: currentChunkIndex + 1,
        totalChunks: pdfChunks.length
      },
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      error: error.message,
      details: error.stack
    });
  }
});

const PORT = process.env.PORT || 8080;
console.log(`Starting server with PORT=${PORT}`);
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
}); 