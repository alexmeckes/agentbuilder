# 📊 Progress Visualization Guide

## Overview

The Progress Visualization system provides real-time visual feedback during workflow execution, allowing users to track the progress of individual nodes and overall workflow execution through dynamic visual indicators, progress bars, and a comprehensive dashboard.

## Features

### 🎯 Core Features

#### 1. **Real-time Node Status Indicators**
- **Visual Status Icons**: Each node displays status-specific icons (idle, pending, running, completed, failed)
- **Dynamic Border Colors**: Node borders change color based on execution state
- **Progress Bars**: Running nodes show progress indicators
- **Animations**: Smooth transitions and animations during state changes

#### 2. **Execution Dashboard**
- **Progress Panel**: Comprehensive dashboard showing execution metrics
- **Real-time Cost Tracking**: Live cost updates during execution
- **Performance Metrics**: Execution time, token usage, and success rates
- **Node-level Details**: Individual node status and performance data

#### 3. **WebSocket Integration**
- **Live Updates**: Real-time status updates via WebSocket connection
- **Connection Management**: Automatic connection handling with cleanup
- **Error Handling**: Graceful degradation when WebSocket is unavailable

## Implementation Architecture

### Components Structure

```
frontend/app/
├── components/workflow/
│   ├── AgentNode.tsx                    # Enhanced node with progress visualization
│   └── ExecutionProgressPanel.tsx      # Progress dashboard component
├── hooks/
│   └── useWorkflowExecution.ts         # Execution state management hook
└── types/workflow.ts                   # Type definitions for execution states
```

### Key Components

#### 1. **useWorkflowExecution Hook**
- **Purpose**: Manages WebSocket connection and execution state
- **Features**: 
  - WebSocket connection lifecycle management
  - Real-time message handling
  - Execution state updates
  - Automatic cleanup on unmount

```typescript
const {
  executionState,
  isConnected,
  getNodeExecutionState,
  startExecution,
  resetExecution
} = useWorkflowExecution(executionId);
```

#### 2. **Enhanced AgentNode Component**
- **Purpose**: Visual node representation with status indicators
- **Features**:
  - Dynamic styling based on execution state
  - Status icons and progress bars
  - Smooth animations and transitions
  - Real-time updates

#### 3. **ExecutionProgressPanel Component**
- **Purpose**: Comprehensive progress dashboard
- **Features**:
  - Overall execution status
  - Node-by-node progress tracking
  - Real-time metrics display
  - Cost and performance analytics

### Type Definitions

#### Node Execution Status
```typescript
export type NodeExecutionStatus = 
  | 'idle' 
  | 'pending' 
  | 'running' 
  | 'completed' 
  | 'failed';

export interface NodeExecutionState {
  status: NodeExecutionStatus;
  progress?: number;
  startTime?: string;
  endTime?: string;
  cost?: number;
  error?: string;
}
```

#### Workflow Execution State
```typescript
export interface WorkflowExecutionState {
  overallStatus: NodeExecutionStatus;
  totalCost: number;
  totalDuration: number;
  completedNodes: number;
  totalNodes: number;
  nodeStates: Record<string, NodeExecutionState>;
}
```

## Visual Design

### Status Colors
- **Idle**: Gray (`border-gray-300`)
- **Pending**: Blue (`border-blue-400`)
- **Running**: Yellow (`border-yellow-400`)
- **Completed**: Green (`border-green-500`)
- **Failed**: Red (`border-red-500`)

### Status Icons
- **Idle**: Clock icon
- **Pending**: Loading spinner
- **Running**: Play icon with animation
- **Completed**: Check circle
- **Failed**: X circle

### Progress Indicators
- **Progress Bar**: Animated progress bar for running nodes
- **Pulse Animation**: Subtle pulse effect for active nodes
- **Smooth Transitions**: CSS transitions for state changes

## Usage Examples

### Basic Integration

```typescript
// In WorkflowEditor.tsx
const { executionState, getNodeExecutionState } = useWorkflowExecution(executionId);

// Enhance nodes with execution state
const enhancedNodes = useMemo(() => {
  return nodes.map(node => ({
    ...node,
    data: {
      ...node.data,
      executionState: getNodeExecutionState(node.id)
    }
  }));
}, [nodes, getNodeExecutionState]);
```

### Custom Node with Progress

```typescript
// In AgentNode.tsx
const AgentNode = ({ data }) => {
  const executionState = data.executionState || { status: 'idle' };
  
  return (
    <div className={`node ${getStatusBorderClass(executionState.status)}`}>
      <div className="node-header">
        <StatusIcon status={executionState.status} />
        <span className="node-title">{data.title}</span>
      </div>
      
      {executionState.status === 'running' && (
        <ProgressBar progress={executionState.progress || 0} />
      )}
      
      <div className="node-content">
        {/* Node content */}
      </div>
    </div>
  );
};
```

## WebSocket Protocol

### Message Types

#### Progress Update Message
```typescript
interface ExecutionProgressMessage {
  type: 'progress';
  executionId: string;
  nodeId: string;
  status: NodeExecutionStatus;
  progress?: number;
  cost?: number;
  error?: string;
  timestamp: string;
}
```

#### Execution Complete Message
```typescript
interface ExecutionCompleteMessage {
  type: 'complete';
  executionId: string;
  finalState: WorkflowExecutionState;
  timestamp: string;
}
```

### Connection Flow

1. **Connection Establishment**: WebSocket connects to `/ws/execution/{executionId}`
2. **Status Updates**: Real-time progress messages received and processed
3. **State Management**: Hook updates component state triggering re-renders
4. **Cleanup**: Connection closed and cleaned up on component unmount

## Best Practices

### Performance Optimization
- **Memoization**: Use `useMemo` for expensive computations
- **Selective Updates**: Only update nodes that have changed state
- **Debouncing**: Debounce rapid successive updates

### Error Handling
- **Graceful Degradation**: Function without WebSocket if unavailable
- **Retry Logic**: Automatic reconnection on connection loss
- **User Feedback**: Clear error messages and recovery options

### Accessibility
- **Screen Reader Support**: ARIA labels for status indicators
- **Keyboard Navigation**: Support for keyboard-only users
- **High Contrast**: Ensure sufficient color contrast for status indicators

## Troubleshooting

### Common Issues

#### 1. **WebSocket Connection Fails**
- **Symptoms**: No real-time updates, connection status shows disconnected
- **Solutions**: 
  - Check backend WebSocket endpoint availability
  - Verify execution ID is valid
  - Check network connectivity

#### 2. **Status Updates Not Reflecting**
- **Symptoms**: Nodes not updating despite execution progress
- **Solutions**:
  - Verify WebSocket message format
  - Check hook state management
  - Ensure proper component re-rendering

#### 3. **Performance Issues**
- **Symptoms**: Slow UI updates, high CPU usage
- **Solutions**:
  - Implement proper memoization
  - Reduce update frequency
  - Optimize component rendering

## Future Enhancements

### Planned Features
- **Progress Timeline**: Visual timeline of execution steps
- **Performance Heatmap**: Color-coded performance visualization
- **Execution Replay**: Ability to replay execution progress
- **Custom Status Indicators**: User-defined status visualization
- **Export Progress Data**: Export execution progress for analysis

### Technical Improvements
- **Offline Support**: Cache progress data for offline viewing
- **Multi-execution Tracking**: Support for multiple concurrent executions
- **Advanced Animations**: More sophisticated visual effects
- **Mobile Optimization**: Better mobile experience for progress tracking

## Integration Notes

### Backend Requirements
- WebSocket endpoint for real-time updates
- Progress message broadcasting
- Execution state persistence

### Frontend Dependencies
- React Flow for node visualization
- WebSocket API for real-time communication
- CSS animations for smooth transitions

### Testing Considerations
- Mock WebSocket for unit tests
- Test connection handling scenarios
- Verify accessibility compliance 