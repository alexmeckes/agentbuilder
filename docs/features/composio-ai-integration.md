# Composio Tools in AI Assistant

This document describes how the AI Assistant can now create Composio tool nodes automatically based on user requests.

## Overview

The AI Assistant has been enhanced to recognize and create Composio tool nodes when users request workflows that need external service integrations. This eliminates the need to manually drag Composio tools from the node palette after AI generates a workflow.

## How It Works

### 1. User Configuration
- User configures their Composio API key in Account Settings
- User enables specific Composio tools they want to use
- These settings are stored in localStorage

### 2. Enhanced AI Context
When chatting with the AI Assistant, the system now:
- Passes the user's enabled Composio tools to the AI
- Includes tool descriptions in the workflow context
- AI knows which external tools are available

### 3. Smart Tool Detection
When the AI creates a tool node:
- The system detects tool names that match Composio services
- Maps them to the correct `composio_` tool types
- Only creates tools that the user has enabled

### 4. Automatic Configuration
Created Composio tools are automatically configured with:
- Correct `tool_type` (e.g., `composio_github_star_repo`)
- `isComposio` flag set to true
- Proper visual styling in the workflow

## Supported Composio Tools

The following tools can be created by the AI Assistant:

| Service | Tool ID | Keywords | Description |
|---------|---------|----------|-------------|
| GitHub | `github_star_repo` | github, star, repository | Star GitHub repositories |
| GitHub | `github_create_issue` | github, issue | Create GitHub issues |
| Slack | `slack_send_message` | slack, message | Send Slack messages |
| Gmail | `gmail_send_email` | gmail, email | Send emails via Gmail |
| Notion | `notion_create_page` | notion, page | Create Notion pages |
| Linear | `linear_create_issue` | linear, issue | Create Linear issues |

## Usage Examples

### Example 1: GitHub Integration
**User:** "Create a workflow to star a GitHub repository when I provide a URL"

**AI Response:**
```
I'll create a workflow that stars a GitHub repository. Here's what it will do:

1. Take a repository URL as input
2. Use the GitHub Star tool to star the repository
3. Display the result

[ACTIONS]
CREATE_NODE:input:RepoURL:Enter the GitHub repository URL to star
CREATE_NODE:tool:GitHubStar:Star the specified GitHub repository
CREATE_NODE:output:Result:Display the result of starring the repository
CONNECT_NODES:RepoURL:GitHubStar
CONNECT_NODES:GitHubStar:Result
[/ACTIONS]
```

The system will automatically detect "GitHubStar" and create a `composio_github_star_repo` tool node.

### Example 2: Multi-Service Workflow
**User:** "Build a workflow that monitors GitHub issues and sends notifications to Slack"

**AI Response:**
```
I'll create a workflow that monitors GitHub issues and sends Slack notifications:

[ACTIONS]
CREATE_NODE:input:IssueMonitor:GitHub issue webhook trigger
CREATE_NODE:agent:IssueAnalyzer:Analyze the GitHub issue and extract key information:gpt-4o-mini
CREATE_NODE:tool:SlackMessage:Send notification to Slack channel
CREATE_NODE:output:NotificationStatus:Display notification status
CONNECT_NODES:IssueMonitor:IssueAnalyzer
CONNECT_NODES:IssueAnalyzer:SlackMessage
CONNECT_NODES:SlackMessage:NotificationStatus
[/ACTIONS]
```

## Requirements

1. **Composio API Key**: Must be configured in Account Settings
2. **Enabled Tools**: Only tools enabled by the user will be created
3. **Tool Names**: AI must use recognizable names that include service keywords

## Technical Implementation

### Configuration File
- `frontend/app/config/composio-tools.ts` - Central configuration for tool mappings

### Key Components Modified
- `frontend/app/api/chat/route.ts` - Passes user settings to AI context
- `frontend/app/components/ChatInterface.tsx` - Includes user settings in chat
- `frontend/app/page.tsx` - Detects and maps Composio tools
- AI Assistant instructions updated to know about Composio tools

### Tool Detection Logic
```typescript
// The system checks tool names for keywords
if (toolName.includes('github') && toolName.includes('star')) {
  // Maps to composio_github_star_repo
}
```

## Limitations

1. **Enabled Tools Only**: AI can only create tools the user has enabled
2. **Name Recognition**: Tool names must include recognizable keywords
3. **Fallback Behavior**: Unrecognized tools default to `web_search`

## Future Enhancements

- Support for more Composio tools as they become available
- Dynamic tool discovery from Composio API
- Tool parameter configuration in AI-generated workflows
- Multi-user tool permissions and sharing 