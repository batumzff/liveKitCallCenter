# LiveKit Call Center

AI-powered call center management system with advanced analytics and automation built on LiveKit platform.

## Features

### 🤖 AI Agent Management
- **Multimodal Agents**: Voice, text, and data processing capabilities
- **Custom Prompts**: Agent-specific conversation flows and behaviors
- **Voice Settings**: Configurable TTS providers (OpenAI, ElevenLabs)
- **Function Calling**: Customer lookup, call outcome tracking, transfers
- **Auto-scaling**: Dynamic agent deployment based on load

### 📞 Advanced Calling
- **SIP Integration**: Enterprise-grade telephony with LiveKit SIP
- **Outbound Campaigns**: Automated campaign management
- **Call Routing**: Intelligent agent assignment
- **Real-time Monitoring**: Live call tracking and analytics
- **Transfer Support**: Seamless call transfers between agents/departments

### 📊 Analytics & Reporting
- **Real-time Analytics**: Call metrics, sentiment analysis
- **Performance Tracking**: Agent efficiency, success rates
- **Conversation Analysis**: Key topic extraction, action items
- **Custom Reports**: Exportable data in JSON/CSV formats
- **Trend Analysis**: Historical performance insights

### 🎛️ Management Dashboard
- **Project Organization**: Multi-tenant project structure
- **Contact Management**: Customer database with history
- **Campaign Scheduling**: Automated calling workflows
- **Agent Deployment**: Lifecycle management and scaling
- **System Monitoring**: Health checks and resource usage

## Architecture

### Backend Components
- **FastAPI**: REST API with automatic documentation
- **MongoDB**: Document database with Beanie ODM
- **LiveKit**: Real-time communication platform
- **Redis**: Caching and session management (optional)

### Agent Types
1. **Basic Agent** (`agent.py`): Standard voice assistant
2. **Worker Agent** (`agent_worker.py`): Enhanced routing and management
3. **Multimodal Agent** (`multimodal_agent.py`): Advanced capabilities with function calling

### Frontend
- **Next.js 14**: Modern React framework
- **TypeScript**: Type-safe development
- **TailwindCSS**: Utility-first styling
- **React Query**: Data fetching and caching

## Quick Start

### 1. Environment Setup

```bash
# Clone and navigate to project
cd liveKitCallCenter

# Copy environment file
cp .env.example .env

# Edit .env with your credentials
# - LiveKit URL, API Key, API Secret
# - SIP Trunk ID
# - OpenAI API Key
# - ElevenLabs API Key (optional)
# - MongoDB URL
```

### 2. Database Setup

```bash
# Install and start MongoDB
brew install mongodb-community
brew services start mongodb-community

# Or use MongoDB Atlas cloud database
# Update MONGODB_URL in .env accordingly
```

### 3. Backend Installation

```bash
# Install Python dependencies
pip3 install -r requirements.txt

# Start the API server
python3 main.py
```

API will be available at `http://localhost:8000`
- **API Documentation**: `http://localhost:8000/docs`
- **Health Check**: `http://localhost:8000/health`

### 4. Frontend Installation

```bash
# Navigate to frontend directory
cd frontend

# Install Node.js dependencies
npm install

# Start development server
npm run dev
```

Frontend will be available at `http://localhost:3000`

### 5. Agent Deployment

```bash
# Deploy basic agent
python3 agent.py

# Deploy worker agent (recommended)
python3 agent_worker.py

# Deploy multimodal agent (advanced features)
python3 multimodal_agent.py
```

## API Documentation

### Core Endpoints

#### Projects
- `GET /api/v1/projects` - List projects
- `POST /api/v1/projects` - Create project
- `PUT /api/v1/projects/{id}` - Update project
- `DELETE /api/v1/projects/{id}` - Delete project

#### AI Agents
- `GET /api/v1/agents` - List agents
- `POST /api/v1/agents` - Create agent
- `PUT /api/v1/agents/{id}` - Update agent
- `POST /api/v1/agents/{id}/test` - Test agent

#### Calls
- `GET /api/v1/calls` - List calls with filters
- `POST /api/v1/calls/outbound` - Initiate outbound call
- `PUT /api/v1/calls/{id}` - Update call status
- `GET /api/v1/calls/contact/{id}/history` - Call history

#### Analytics
- `GET /api/v1/analytics/project/{id}/summary` - Project analytics
- `GET /api/v1/analytics/project/{id}/trends` - Trend analysis
- `GET /api/v1/analytics/project/{id}/agent-performance` - Agent metrics
- `GET /api/v1/analytics/project/{id}/export` - Export data

#### SIP Integration
- `POST /api/v1/sip/outbound/initiate` - Enhanced SIP calling
- `GET /api/v1/sip/trunk/status` - Trunk capacity
- `POST /api/v1/sip/calls/{id}/transfer` - Call transfer
- `GET /api/v1/sip/calls/active` - Active call monitoring

#### Agent Management
- `POST /api/v1/agent-management/deploy` - Deploy agent instances
- `GET /api/v1/agent-management/instances` - List instances
- `POST /api/v1/agent-management/scale/{id}` - Scale agent
- `GET /api/v1/agent-management/stats/{id}` - Agent statistics

## Configuration

### Agent Configuration

```python
# Example agent configuration
{
    "name": "Customer Support Agent",
    "prompt": "You are a helpful customer support agent...",
    "voice_settings": {
        "provider": "openai",  # or "elevenlabs"
        "voice": "alloy",
        "model": "tts-1"
    },
    "behavior_settings": {
        "temperature": 0.7,
        "max_tokens": 500,
        "greeting": "Hello! How can I help you today?"
    }
}
```

### SIP Configuration

```bash
# Required environment variables
LIVEKIT_URL=wss://your-livekit-instance.com
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret
SIP_TRUNK_ID=your-sip-trunk-id
```

### Database Models

- **Project**: Multi-tenant organization
- **AIAgent**: Agent configuration and settings
- **Contact**: Customer information and history
- **Campaign**: Calling campaigns and schedules
- **Call**: Individual call records and analytics
- **CallAnalytics**: Detailed conversation analysis

## Advanced Features

### Function Calling

Agents can perform actions during calls:

```python
# Customer lookup
await lookup_customer(phone_number="1234567890")

# Set call outcome
await set_call_outcome(outcome="resolved", summary="Issue resolved")

# Schedule callback
await schedule_callback(time="tomorrow 2pm", reason="Follow up")

# Transfer call
await transfer_call(department="technical", reason="Complex issue")
```

### Auto-scaling

Deploy agents with automatic scaling:

```python
deployment = {
    "agent_id": "agent-123",
    "auto_scale": True,
    "min_replicas": 1,
    "max_replicas": 10,
    "scaling_rules": {
        "metric": "call_queue",
        "threshold_up": 0.8,
        "threshold_down": 0.3
    }
}
```

### Webhook Integration

Handle LiveKit events:

```python
@app.post("/api/v1/sip/webhook/events")
async def handle_sip_webhook(event_data: dict):
    # Process participant_joined, participant_left, etc.
    # Update call status and analytics
```

## Deployment

### Production Deployment

1. **Environment Configuration**
   ```bash
   # Production environment variables
   ENVIRONMENT=production
   DEBUG=False
   MONGODB_URL=mongodb://prod-cluster/callcenter
   REDIS_URL=redis://prod-redis:6379
   ```

2. **Database Setup**
   ```bash
   # MongoDB with replica set
   # Redis for caching and sessions
   # Proper indexing for performance
   ```

3. **Load Balancing**
   ```bash
   # Multiple API instances behind load balancer
   # Agent worker scaling based on demand
   # Database connection pooling
   ```

### Docker Deployment

```dockerfile
# Example Dockerfile
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## Monitoring

### Health Checks

- **API Health**: `GET /health`
- **Database**: Connection and query performance
- **Agent Status**: Instance health and resource usage
- **SIP Trunk**: Capacity and call quality

### Metrics

- **Call Metrics**: Volume, duration, success rates
- **Agent Performance**: Response times, resolution rates
- **System Load**: CPU, memory, concurrent calls
- **Business KPIs**: Customer satisfaction, revenue impact

## Troubleshooting

### Common Issues

1. **MongoDB Connection Failed**
   ```bash
   # Check MongoDB status
   brew services list | grep mongo
   # Restart if needed
   brew services restart mongodb-community
   ```

2. **LiveKit Connection Issues**
   ```bash
   # Verify credentials in .env
   # Check network connectivity
   # Validate SIP trunk configuration
   ```

3. **Agent Not Responding**
   ```bash
   # Check agent process status
   # Review logs for errors
   # Verify agent configuration
   ```

### Logs

- **API Logs**: FastAPI request/response logging
- **Agent Logs**: Agent instance lifecycle and errors
- **Call Logs**: SIP events and call progression
- **Analytics Logs**: Data processing and insights

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- **Documentation**: [LiveKit Docs](https://docs.livekit.io/)
- **Issues**: GitHub Issues
- **Community**: LiveKit Discord

---

Built with ❤️ using LiveKit, FastAPI, and Next.js