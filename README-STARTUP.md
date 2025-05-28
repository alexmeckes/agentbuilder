# 🚀 any-agent Workflow Composer - Easy Startup

This directory contains convenient scripts to easily start and stop the any-agent Workflow Composer application.

## 📋 Prerequisites

- **Python 3.8+** with `pip`
- **Node.js 16+** with `npm`
- **OpenAI API Key** (set in `.env` file)

## 🎯 Quick Start

### Option 1: Production Mode (Background Services)
```bash
./start.sh
```
- Starts both backend and frontend in background
- Services run independently
- Logs saved to `backend.log` and `frontend.log`
- Perfect for production or when you want to use the app

### Option 2: Development Mode (Foreground with Live Logs)
```bash
./dev.sh
```
- Starts both services in foreground
- See live logs from both services
- Auto-reload on file changes
- Press `Ctrl+C` to stop both services
- Perfect for development

### Stop Services
```bash
./stop.sh
```
- Gracefully stops all services
- Cleans up processes and log files

## 📡 Service URLs

Once started, you can access:

- **🌐 Frontend**: http://localhost:3000 (or http://localhost:3001 if 3000 is busy)
- **📡 Backend API**: http://localhost:8000
- **📖 API Documentation**: http://localhost:8000/docs

## 🎮 How to Use the Application

### 1. **Access the Frontend**
Open your browser and go to http://localhost:3000. You'll see the any-agent Workflow Composer interface with several tabs:

- **🤖 AI Assistant** - Chat interface for creating workflows
- **🔧 Visual Designer** - Drag-and-drop workflow builder
- **▶️ Trace Viewer** - View execution traces
- **📊 Analytics** - Performance metrics
- **🧪 Experiments** - A/B testing
- **🏆 Evaluations** - Quality assessments

### 2. **Create Your First Workflow**

#### **Method A: Using the AI Assistant (Recommended for Beginners)**

1. Click on the **"AI Assistant"** tab (should be selected by default)
2. Type a natural language description of what you want to build:

**Example prompts to try:**
```
"Create a customer support chatbot that can handle complaints and escalate to humans"

"Build a data analysis pipeline that processes CSV files and generates reports"

"Make a content generation workflow that creates blog posts from topics"

"Design a research assistant that can search the web and summarize findings"

"Create a multi-step workflow for email marketing automation"
```

3. The AI will automatically create nodes and connections for your workflow
4. Review the generated workflow and make adjustments if needed
5. Click **"Execute Workflow"** to test it

#### **Method B: Using the Visual Designer (For Advanced Users)**

1. Click on the **"Visual Designer"** tab
2. Drag nodes from the sidebar onto the canvas:
   - **Agent Nodes**: AI agents with specific instructions
   - **Tool Nodes**: Functions like web search, file processing
   - **Logic Nodes**: Conditional branching, loops
   - **Input/Output Nodes**: Data entry and exit points
3. Connect nodes by dragging from output ports to input ports
4. Configure each node by clicking on it and setting properties
5. Test your workflow with sample data

### 3. **Workflow Examples**

#### **Example 1: Simple Q&A Bot**
```
Input → Agent (Instructions: "Answer questions helpfully") → Output
```

#### **Example 2: Research Pipeline**
```
Input → Web Search → Summarizer Agent → Report Generator → Output
```

#### **Example 3: Content Creation**
```
Topic Input → Research Agent → Content Writer → Editor Agent → Final Output
```

#### **Example 4: Data Processing**
```
CSV Input → Data Cleaner → Analyzer Agent → Chart Generator → Report Output
```

### 4. **Testing Workflows**

1. **Single Test**: Enter test data and click "Execute"
2. **Batch Testing**: Upload multiple test cases
3. **Live Testing**: Connect to real data sources
4. **A/B Testing**: Compare different workflow versions

### 5. **Monitoring and Debugging**

- **Trace Viewer**: See step-by-step execution
- **Logs**: Check `backend.log` and `frontend.log` for errors
- **Analytics**: Monitor performance metrics
- **Error Handling**: Set up fallback behaviors

## 🔧 What the Scripts Do

### `start.sh`
1. ✅ Checks and kills any existing processes on ports 3000, 3001, 8000
2. 🐍 Sets up Python virtual environment (if needed)
3. 📦 Installs/updates backend dependencies
4. 📄 Copies `.env` file from `workflow-composer/backend/.env`
5. 🚀 Starts backend on port 8000
6. 📦 Installs frontend dependencies (if needed)
7. 🌐 Starts frontend on port 3000/3001
8. ✅ Verifies both services are running

### `stop.sh`
1. 🛑 Gracefully stops backend (port 8000)
2. 🛑 Gracefully stops frontend (ports 3000, 3001)
3. 🧹 Kills any remaining processes
4. 🗑️ Cleans up log files

### `dev.sh`
1. 🛑 Stops any existing services
2. 🔧 Sets up both backend and frontend
3. 🚀 Starts both in foreground with live output
4. ⌨️ Handles Ctrl+C to stop both services cleanly

## 🔑 Environment Setup

Make sure you have an OpenAI API key set up:

1. Create or edit `workflow-composer/backend/.env`:
```bash
OPENAI_API_KEY=your_openai_api_key_here
```

2. The startup scripts will automatically copy this to `backend/.env`

## 💡 Usage Tips

### **For Beginners**
- Start with the AI Assistant tab
- Use simple, clear descriptions of what you want
- Try the example prompts provided
- Start with single-agent workflows before building complex ones

### **For Developers**
- Use `./dev.sh` for development with live logs
- Check the API docs at http://localhost:8000/docs
- Use the Visual Designer for precise control
- Monitor logs for debugging: `tail -f backend.log frontend.log`

### **For Production**
- Use `./start.sh` for background services
- Set up proper monitoring and alerting
- Use batch testing for quality assurance
- Implement proper error handling and fallbacks

## 🚀 Common Workflows to Try

### **1. Customer Support Bot**
```
"Create a customer support workflow that:
1. Understands customer issues
2. Provides helpful solutions
3. Escalates complex issues to humans
4. Logs all interactions"
```

### **2. Content Marketing Pipeline**
```
"Build a content marketing workflow that:
1. Takes a topic as input
2. Researches the topic online
3. Creates an outline
4. Writes a blog post
5. Generates social media posts"
```

### **3. Data Analysis Assistant**
```
"Design a data analysis workflow that:
1. Accepts CSV data
2. Cleans and validates the data
3. Performs statistical analysis
4. Creates visualizations
5. Generates a summary report"
```

### **4. Email Automation**
```
"Create an email automation workflow that:
1. Segments customers by behavior
2. Personalizes email content
3. Schedules optimal send times
4. Tracks engagement metrics
5. Adjusts strategy based on results"
```

## 🐛 Troubleshooting

### Port Already in Use
The scripts automatically detect and kill processes using the required ports.

### Backend Won't Start
- Check `backend.log` for error details
- Ensure OpenAI API key is set in `.env` file
- Verify Python dependencies are installed

### Frontend Won't Start
- Check `frontend.log` for error details
- Try deleting `workflow-composer/node_modules` and running the script again
- Ensure Node.js version is 16+

### Workflow Execution Fails
- Check that your OpenAI API key is valid and has credits
- Verify the workflow logic makes sense
- Check the Trace Viewer for detailed error information
- Simplify the workflow to isolate issues

### Permission Denied
Make scripts executable:
```bash
chmod +x start.sh stop.sh dev.sh
```

## 📊 Monitoring

### View Live Logs (Production Mode)
```bash
# Backend logs
tail -f backend.log

# Frontend logs
tail -f frontend.log

# Both logs simultaneously
tail -f backend.log frontend.log
```

### Check Service Status
```bash
# Check what's running on the ports
lsof -i :3000,3001,8000

# Test backend
curl http://localhost:8000/

# Test frontend
curl http://localhost:3000/
```

### Using npm Scripts
```bash
# Start services
npm start

# Stop services
npm stop

# Development mode
npm run dev

# View logs
npm run logs

# Check status
npm run status

# Test services
npm run test:backend
npm run test:frontend
```

## 🎉 That's It!

You now have three simple commands to manage your any-agent Workflow Composer:

- `./start.sh` - Start everything in background
- `./dev.sh` - Start everything for development
- `./stop.sh` - Stop everything

**Next Steps:**
1. 🚀 Run `./start.sh` to get started
2. 🌐 Open http://localhost:3000 in your browser
3. 🤖 Try the AI Assistant with one of the example prompts
4. 🔧 Explore the Visual Designer for more control
5. 📊 Monitor your workflows with the built-in analytics

Happy workflow building! ✨ 