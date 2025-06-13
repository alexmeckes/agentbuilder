# Visual Designer

The Visual Designer is the core interface for building AI agent workflows using a drag-and-drop canvas.

## Overview

The Visual Designer provides an intuitive way to create complex AI workflows by connecting different types of nodes. It's built on ReactFlow and supports real-time execution visualization.

## Interface Components

### Canvas Area
- **Drag-to-pan** navigation
- **Zoom controls** (10% - 500%)
- **Grid background** for alignment
- **Auto-layout** for node positioning

### Node Palette
Located on the left side, contains draggable nodes:
- **Agent Node** - AI models and LLMs
- **Tool Node** - External tools and APIs
- **Input Node** - Workflow entry points
- **Output Node** - Result collection

### Control Panel
Top toolbar with:
- **Execute** - Run the workflow
- **Clear** - Reset canvas
- **Save/Load** - Workflow persistence
- **Settings** - Configuration options

## Node Types

### Agent Nodes
Configure AI models with:
- **Model Selection**: GPT-4, Claude, Gemini, etc.
- **Instructions**: System prompts and behavior
- **Temperature**: Creativity control
- **Max Tokens**: Output length limits

### Tool Nodes
Available tools include:
- **Web Search** - Internet queries
- **File Operations** - Read/write files
- **API Calls** - HTTP requests
- **Composio Tools** - 100+ external services

### Input/Output Nodes
- **Text Input** - Manual text entry
- **File Input** - Upload data
- **Variable Input** - Dynamic values
- **Result Output** - Collect results

## Building Workflows

### Creating Nodes
1. Drag a node type from the palette
2. Drop it on the canvas
3. Nodes auto-position to avoid collisions

### Connecting Nodes
1. Click and drag from an output handle
2. Connect to an input handle
3. Connections validate automatically

### Configuring Nodes
1. Click a node to select it
2. Use the configuration panel on the right
3. Set parameters specific to node type

## Execution

### Running Workflows
1. Click **Execute** button
2. Monitor real-time progress indicators
3. View results in output nodes

### Progress Visualization
- **Border Colors**: Show execution state
  - Gray: Idle
  - Yellow: Pending
  - Blue: Running
  - Green: Completed
  - Red: Failed
- **Progress Bars**: Display completion percentage
- **Status Icons**: Quick visual feedback

## Advanced Features

### Dual-Mode Interface
Toggle between:
- **AI Assistant Mode**: Natural language workflow creation
- **Manual Mode**: Direct drag-and-drop building

### Templates
Pre-configured node setups for common tasks:
- Research workflows
- Content generation
- Data processing
- API integrations

### Workflow Management
- **Save**: Store workflows locally
- **Load**: Import saved workflows
- **Export**: Share workflow configurations
- **Version Control**: Track changes

## Navigation Controls

### Mouse Controls
- **Left Click + Drag**: Pan the canvas
- **Scroll Wheel**: Zoom in/out
- **Right Click**: Context menu

### Keyboard Shortcuts
- **Space + Drag**: Pan mode
- **Delete**: Remove selected nodes
- **Ctrl/Cmd + A**: Select all
- **Ctrl/Cmd + Z**: Undo

### Touch Controls (Tablet)
- **Single Finger**: Select/drag nodes
- **Two Fingers**: Pan canvas
- **Pinch**: Zoom in/out

## Best Practices

### Workflow Design
- Start simple, add complexity gradually
- Use descriptive node labels
- Group related operations
- Test incrementally

### Performance
- Limit parallel branches
- Use appropriate models for tasks
- Monitor execution costs
- Cache repeated operations

### Organization
- Use consistent naming
- Document complex logic
- Create reusable templates
- Version important workflows

## Troubleshooting

### Common Issues

**Nodes won't connect**
- Check compatible types
- Verify connection direction
- Ensure no cycles exist

**Execution fails**
- Review node configurations
- Check API keys
- Verify tool permissions

**Canvas performance**
- Reduce node count
- Disable animations
- Clear unused nodes

For more details on specific features, see:
- [AI Assistant](./ai-assistant.md)
- [Analytics](./analytics.md)
- [A/B Testing](./ab-testing.md)