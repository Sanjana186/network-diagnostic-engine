import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { runDiagnostics } from './controllers/diagnosticController.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

// Enable CORS so the React frontend can communicate with this API
app.use(cors({
  origin: CLIENT_ORIGIN,
  methods: ['GET', 'POST'],
  credentials: true
}));

// Body parsing middleware
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Network Diagnostic Engine API'
  });
});

// Diagnostic endpoint
app.post('/api/diagnose', runDiagnostics);

app.listen(PORT, () => {
  console.log(`Diagnostic backend server running on http://localhost:${PORT}`);
});
