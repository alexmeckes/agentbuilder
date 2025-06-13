# Architecture Overview

This document describes the technical architecture of the Any-Agent Workflow Composer.

## System Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Frontend       │────▶│  Backend API    │────▶│  Any-Agent      │
│  (Next.js)      │◀────│  (FastAPI)      │◀────│  Framework      │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Browser        │     │  WebSocket      │     │  AI Providers   │
│  Storage        │     │  Server         │     │  (OpenAI, etc)  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Frontend Architecture

### Technology Stack
- **Framework**: Next.js 14 (App Router)
- **UI Library**: React 18
- **Styling**: Tailwind CSS
- **State Management**: React Context + Hooks
- **Type Safety**: TypeScript
- **Workflow Canvas**: ReactFlow

### Component Structure

```
app/
├── components/
│   ├── Designer/          # Visual workflow builder
│   ├── Assistant/         # AI chat interface
│   ├── Analytics/         # Dashboard components
│   ├── Testing/           # A/B testing UI
│   └── Common/            # Shared components
├── lib/
│   ├── api/              # API client functions
│   ├── utils/            # Helper functions
│   └── hooks/            # Custom React hooks
└── types/                # TypeScript definitions
```

### Key Design Patterns

**Component Composition**
- Small, focused components
- Props drilling minimized
- Context for global state

**Data Flow**
- Unidirectional data flow
- API calls in parent components
- Child components are presentational

**Performance**
- React.memo for expensive renders
- Dynamic imports for code splitting
- Optimistic UI updates

## Backend Architecture

### Technology Stack
- **Framework**: FastAPI
- **Language**: Python 3.11+
- **Async**: asyncio + uvicorn
- **Validation**: Pydantic
- **Process Management**: multiprocessing

### Application Structure

```
backend/
├── main.py               # FastAPI application
├── routers/
│   ├── frameworks.py     # Framework endpoints
│   ├── execution.py      # Workflow execution
│   └── analytics.py      # Metrics endpoints
├── services/
│   ├── translator.py     # Workflow translation
│   ├── executor.py       # Execution engine
│   └── tracer.py         # Execution tracing
└── models/
    ├── workflow.py       # Workflow models
    └── execution.py      # Execution models
```

### Key Components

**FastAPI Application**
- RESTful API design
- Automatic API documentation
- Request/response validation
- CORS configuration

**Execution Engine**
- Process isolation for asyncio conflicts
- Dynamic framework loading
- Real-time status updates
- Error handling and recovery

**WebSocket Server**
- Real-time execution updates
- Connection management
- Message queuing
- Graceful disconnection

## Data Flow

### Workflow Execution

1. **Frontend**: User creates workflow in Visual Designer
2. **API Call**: POST /execute with workflow JSON
3. **Translation**: Visual nodes → Any-Agent config
4. **Execution**: Spawned process runs workflow
5. **WebSocket**: Real-time updates to frontend
6. **Storage**: Results saved for analytics

### Real-time Updates

```
Frontend ──────► Backend ──────► Executor Process
   ▲                │                    │
   │                ▼                    ▼
   └──── WebSocket ◄──── Status Queue ◄──┘
```

## API Design

### RESTful Endpoints

```
GET  /frameworks           # List available frameworks
POST /execute             # Execute workflow
GET  /executions/{id}     # Get execution details
GET  /analytics/workflows # Get workflow analytics
WS   /ws/execution/{id}   # Real-time updates
```

### Request/Response Format

**Workflow Execution Request**
```json
{
  "workflow": {
    "nodes": [...],
    "edges": [...]
  },
  "framework": "openai",
  "api_key": "..."
}
```

**Execution Response**
```json
{
  "execution_id": "exec_123",
  "status": "running",
  "result": null,
  "error": null
}
```

## Security Considerations

### API Security
- API key validation
- CORS configuration
- Input sanitization
- Rate limiting

### Data Protection
- Secrets in environment variables
- No sensitive data in logs
- Encrypted connections (HTTPS)
- User isolation

## Scalability

### Frontend
- Static generation where possible
- CDN for assets
- Lazy loading components
- Service worker caching

### Backend
- Stateless design
- Horizontal scaling ready
- Connection pooling
- Async operations

### Process Management
- Worker pool for executions
- Queue for job management
- Timeout handling
- Resource limits

## Integration Points

### Any-Agent Framework
- Dynamic framework loading
- Standardized interfaces
- Error propagation
- Result formatting

### External Services
- AI provider APIs
- Composio tool integration
- Webhook support
- OAuth flows

### Monitoring
- Execution metrics
- Performance tracking
- Error reporting
- Usage analytics

## Development Patterns

### Frontend Patterns
- Container/Presenter components
- Custom hooks for logic
- Error boundaries
- Suspense for loading

### Backend Patterns
- Dependency injection
- Repository pattern
- Service layer
- Domain models

### Testing Strategy
- Unit tests for logic
- Integration tests for API
- E2E tests for workflows
- Performance benchmarks

## Future Considerations

### Planned Enhancements
- GraphQL API option
- Real-time collaboration
- Plugin architecture
- Mobile responsive design

### Technical Debt
- Migrate to Redux for complex state
- Implement caching layer
- Add message queue
- Enhance monitoring

For implementation details, see [API Reference](./api-reference.md).