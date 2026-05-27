require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const uploadRoutes = require('./routes/upload');
const graphRoutes = require('./routes/graph');
const aiRoutes = require('./routes/ai');
const progressRoutes = require('./routes/progress');
const profileRoutes = require('./routes/profile');
const searchRoutes = require('./routes/search');
const quizRoutes = require('./routes/quiz');
const notesRoutes = require('./routes/notes');

const app = express();

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, '../frontend')));

// API
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/graph', graphRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/notes', notesRoutes);

// 🔥 FIX: REMOVE app.get('*') ERROR (important for Node 24)

// ROOT
//app.get('/', (req, res) => {
  //res.sendFile(path.join(__dirname, '../frontend/login.html'));
//});
// Default route → login page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

mongoose.connect("mongodb://localhost:27017/neuromap")
.then(() => {
  console.log("MongoDB connected");
  app.listen(5000, () => console.log("Server running"));
});