# 🐙 GitHub MCP Server Integration Guide

## Overview

We've successfully integrated [GitHub's official MCP server](https://github.com/github/github-mcp-server) into the any-agent Workflow Composer! This provides comprehensive GitHub integration with 35+ tools for repository management, issues, pull requests, code scanning, and more.

## ✅ **What's Already Set Up**

### 🏗️ **Infrastructure Complete**
- ✅ GitHub MCP Server v0.4.0 binary installed (`backend/github-mcp-server`)
- ✅ Server configuration ready in `backend/mcp_config/servers.json`
- ✅ Enhanced available servers API with GitHub features
- ✅ Test scripts for validation (`test_github_mcp.py`)
- ✅ Full integration with existing MCP Phase 2 infrastructure

### 🔧 **Available GitHub Tools** (35+ tools ready!)

Based on the [official GitHub MCP server documentation](https://github.com/github/github-mcp-server), here are the powerful tools available:

#### **📁 Repository Management**
- `list_repositories` - List repositories for a user/organization  
- `get_repository` - Get detailed repository information
- `create_repository` - Create new repositories
- `fork_repository` - Fork repositories
- `search_repositories` - Search GitHub repositories

#### **🎯 Issues Management**
- `list_issues` - List issues in a repository
- `get_issue` - Get detailed issue information
- `create_issue` - Create new issues
- `update_issue` - Update existing issues
- `add_issue_labels` - Add labels to issues
- `remove_issue_labels` - Remove labels from issues

#### **🔄 Pull Requests**
- `list_pull_requests` - List pull requests
- `get_pull_request` - Get PR details
- `create_pull_request` - Create new PRs
- `update_pull_request` - Update existing PRs
- `create_pr_review` - Create PR reviews
- `merge_pull_request` - Merge pull requests

#### **📝 File Operations**
- `get_file_contents` - Read file contents
- `create_or_update_file` - Write/update files
- `delete_file` - Delete files
- `push_files` - Push multiple files

#### **🌿 Branch Management**
- `create_branch` - Create new branches
- `list_commits` - List commits
- `get_commit` - Get commit details

#### **🔍 Search & Discovery**
- `search_code` - Search code across GitHub
- `search_users` - Find GitHub users
- `search_repositories` - Advanced repository search

#### **🔒 Security & Scanning**
- `list_code_scanning_alerts` - Code scanning alerts
- `get_code_scanning_alert` - Detailed alert info
- `list_secret_scanning_alerts` - Secret scanning alerts
- `get_secret_scanning_alert` - Secret alert details

#### **📬 Notifications & Collaboration**
- `list_notifications` - GitHub notifications
- `get_notification_details` - Notification details
- `dismiss_notification` - Mark notifications as read
- `manage_repository_subscription` - Repository watching

#### **🤖 Advanced Features**
- `assign_copilot_to_issue` - GitHub Copilot assignment
- Repository content access via resources
- Support for different refs (branches, commits, tags, PRs)

## 🚀 **Quick Setup (5 minutes)**

### **Step 1: Create GitHub Personal Access Token**

1. Go to [GitHub Settings → Personal Access Tokens](https://github.com/settings/tokens)
2. Click **"Generate new token (classic)"**
3. Set expiration (recommend 90 days or longer)
4. Select these scopes:
   ```
   ✅ repo (Full control of private repositories)
   ✅ read:user (Read user profile data)  
   ✅ user:email (Access user email addresses)
   ✅ notifications (Access notifications)
   ✅ read:org (Read organization data) - optional
   ```
5. Click **"Generate token"**
6. **Copy the token immediately** (you won't see it again!)

### **Step 2: Configure Authentication**

Edit `backend/mcp_config/servers.json`:

```json
{
  "id": "github",
  "name": "GitHub Integration", 
  "description": "Comprehensive GitHub repository management, issues, pull requests, and more",
  "command": ["./github-mcp-server"],
  "args": [],
  "env": {
    "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_your_actual_token_here"
  },
  "working_dir": "/Users/ameckes/Downloads/any-agent-main 2/backend",
  "host": null,
  "port": null,
  "credentials": {},
  "status": "disconnected",
  "last_error": null,
  "capabilities": []
}
```

Replace `"ghp_your_actual_token_here"` with your actual GitHub token.

### **Step 3: Restart & Test**

```bash
# Restart backend server
cd backend
python3 main.py

# Test the integration (in another terminal)
python3 test_github_mcp.py
```

## 🧪 **Testing & Verification**

### **Expected Test Results**
```
🐙 Testing GitHub MCP Integration...
============================================================

1. Checking Available GitHub Servers...
   🐙 GitHub Integration (Official)
      ✅ Official GitHub Server
      Features: Repository management, Issues and Pull Requests...

2. Checking Configured GitHub Server...
   📡 GitHub Integration
      Status: connected ✅
      Tools: 35+ 

3. Testing GitHub Server Connection...
   ✅ GitHub Server Connected!
   🔧 Available Tools: 35+
   📋 Sample GitHub Tools:
      - list_repositories: List repositories for a user or organization
      - get_repository: Get detailed information about a repository
      - create_issue: Create a new issue in a repository
      ...
```

### **Manual Testing Commands**

Test basic connectivity:
```bash
curl -X POST http://localhost:8000/mcp/servers/github/test
```

List available GitHub tools:
```bash
curl -s http://localhost:8000/mcp/tools | jq '.tools | to_entries | map(select(.key | contains("github")))'
```

## 🎯 **Using GitHub MCP in Workflows**

### **Example 1: Repository Info Workflow**
1. **Input Node**: Repository URL or "owner/repo"
2. **GitHub Tool**: `mcp_github_get_repository` 
3. **Parameters**: `{"owner": "github", "repo": "github-mcp-server"}`
4. **Output Node**: Repository details, stars, forks, etc.

### **Example 2: Issue Management Workflow**  
1. **Input Node**: Issue description
2. **GitHub Tool**: `mcp_github_create_issue`
3. **Parameters**: `{"owner": "myorg", "repo": "myrepo", "title": "Bug report", "body": "Issue description"}`
4. **Output Node**: Created issue URL and number

### **Example 3: Code Search Workflow**
1. **Input Node**: Search query
2. **GitHub Tool**: `mcp_github_search_code`
3. **Parameters**: `{"query": "function async", "sort": "indexed"}`
4. **Output Node**: Code search results with file links

## 🔧 **Advanced Configuration**

### **Environment Variables**
You can also set the token as an environment variable:
```bash
export GITHUB_PERSONAL_ACCESS_TOKEN="your_token_here"
```

### **Multiple Token Support**
For organization access, you might want multiple configurations:
```json
{
  "id": "github_org",
  "name": "GitHub Organization", 
  "env": {
    "GITHUB_PERSONAL_ACCESS_TOKEN": "your_org_token_here"
  }
}
```

### **Scoped Access**
Create tokens with minimal required scopes for security:
- **Read-only workflows**: `public_repo`, `read:user`
- **Issue management**: `repo`, `read:user`
- **Full access**: `repo`, `admin:org`, `read:user`, `user:email`

## 🔒 **Security Best Practices**

1. **Token Security**: Never commit tokens to git
2. **Scope Limiting**: Use minimal required scopes
3. **Token Rotation**: Regularly rotate tokens
4. **Environment Separation**: Different tokens for dev/prod
5. **Monitoring**: Monitor token usage in GitHub settings

## 🎉 **What This Enables**

With GitHub MCP integration, you can now build workflows that:

- **📊 Automate Repository Analytics**: Get repo stats, contributors, activity
- **🎯 Manage Issues at Scale**: Bulk create, update, label issues
- **🔄 Automate PR Workflows**: Create PRs, add reviews, merge  
- **🔍 Code Intelligence**: Search codebases, analyze files
- **🔒 Security Monitoring**: Track scanning alerts, vulnerabilities
- **📬 Notification Management**: Process GitHub notifications
- **🤖 AI-Powered Development**: Use with Copilot assignment

## 🚀 **Next Steps**

1. **Set up your GitHub token** following the guide above
2. **Test the integration** with the test script
3. **Explore the MCP Servers tab** in the frontend settings
4. **Build your first GitHub workflow** using the examples
5. **Scale to advanced use cases** like automated DevOps workflows

---

**🎯 Result**: Full GitHub ecosystem integration with 35+ tools ready for workflow automation!

**🔗 Resources**:
- [GitHub MCP Server Repository](https://github.com/github/github-mcp-server)
- [GitHub Personal Access Tokens](https://github.com/settings/tokens)
- [MCP Protocol Documentation](https://modelcontextprotocol.io/) 