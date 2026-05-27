# Personal Knowledge Graph Linker

Personal Knowledge Graph Linker is an AI-powered full-stack web application that converts uploaded PDF documents into an interactive semantic knowledge graph for smarter learning and knowledge visualization.

The platform extracts concepts from documents, connects related topics using graph relationships, generates learning paths, provides AI assistance, tracks learning progress, and creates quizzes for better understanding.

## Features

User Authentication
- User signup and login
- Secure authentication middleware
- Protected dashboard access

Document Upload and Processing
- Upload PDF documents and study materials
- Automatic document processing
- Semantic concept extraction from uploaded files

Knowledge Graph Visualization
- Displays concepts as connected nodes and branches
- Visualizes relationships between topics
- Interactive graph-based learning structure

Learning Path Generation
- Suggests topic-wise learning sequence
- Provides personalized learning flow
- Helps users understand prerequisite topics

AI Assistant
- Integrated semantic AI assistant
- Helps users understand concepts and relationships

Notes Management
- Generates notes for extracted topics
- Downloadable notes support
- Organized knowledge storage

Quiz Generation
- Generates quizzes from uploaded content
- Supports self-assessment and revision

Progress Tracking
- Tracks user learning progress
- Monitors knowledge growth over time

## Tech Stack

Frontend
- HTML
- CSS
- JavaScript

Backend
- Node.js

Database
- MongoDB

AI and Semantic Processing
- Embedding Service
- Concept Extraction
- Edge Builder
- Semantic Knowledge Graph Agent

Authentication and Middleware
- Authentication Middleware
- Protected Routes

## Project Structure

personal-knowledge-graph-linker/

frontend/

routes/
- graph.js
- notes.js
- profile.js
- providers.js

services/
- extract.js
- documents.js
- edgebuilder.js
- embeddingservice.js

middleware/
- authenticationMiddleware.js

agents/
- semantic-knowledgegraph-agent.md

server.js
package.json
README.md

## Installation

Clone the repository

git clone https://github.com/Nivashini-m-2102/personal-knowledge-graph-linker.git

Navigate to the project folder

cd personal-knowledge-graph-linker

Install dependencies

npm install

Run the server

npm start

## Usage

1. Sign up or log in to the platform
2. Upload PDF documents or study materials
3. View extracted concepts in graph format
4. Explore topic relationships and learning paths
5. Generate quizzes for revision
6. Download notes for individual topics
7. Track learning progress over time
