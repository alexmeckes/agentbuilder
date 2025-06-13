# Troubleshooting Guide

Common issues and solutions for the Any-Agent Workflow Composer.

## Quick Fixes

### Restart Everything
```bash
./scripts/stop.sh
./scripts/dev.sh
```

### Check Logs
- Frontend: `frontend.log`
- Backend: `backend.log`
- Browser: Console (F12)

## Common Issues

### Installation Problems

#### "Module not found" errors

**Symptom**: Import errors when starting servers

**Solution**:
```bash
# Frontend
cd frontend
rm -rf node_modules package-lock.json
npm install

# Backend
cd backend
rm -rf venv
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

#### Python version errors

**Symptom**: Syntax errors or compatibility issues

**Solution**:
- Verify Python 3.11+ is installed: `python --version`
- Use pyenv to manage Python versions
- Create fresh virtual environment

### Server Issues

#### Port already in use

**Symptom**: "Address already in use" error

**Solution**:
```bash
# Find process
lsof -i :3000  # Frontend
lsof -i :8000  # Backend

# Kill process
kill -9 <PID>

# Or use cleanup
./scripts/stop.sh
```

#### Backend won't start

**Symptom**: FastAPI fails to launch

**Check**:
1. Virtual environment activated
2. All dependencies installed
3. Environment variables set
4. No syntax errors in Python files

**Solution**:
```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
python -c "import any_agent"  # Test import
python main.py
```

### Workflow Execution

#### Workflows execute but don't appear in Analytics

**Symptom**: Designer shows execution but Analytics shows 0

**Cause**: Missing environment variables

**Solution**:
```bash
# In frontend/.env.local
BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

Both variables required for proxy architecture.

#### "Invalid API key" errors

**Symptom**: Execution fails with authentication error

**Solution**:
1. Check API key is set correctly
2. Verify key hasn't expired
3. Ensure proper environment variable:
   ```bash
   export OPENAI_API_KEY="sk-..."
   ```

#### Execution hangs or times out

**Symptom**: Workflow stays in "running" state

**Causes**:
- API rate limits
- Network issues
- Large model responses

**Solution**:
- Check API provider status
- Reduce workflow complexity
- Add timeout handling
- Monitor backend logs

### UI Issues

#### Nodes won't connect

**Symptom**: Can't draw connections between nodes

**Check**:
- Compatible node types
- Connection direction (output → input)
- No circular dependencies

#### Canvas performance slow

**Symptom**: Laggy drag/drop, slow rendering

**Solution**:
- Reduce node count
- Clear browser cache
- Disable browser extensions
- Use production build

#### Settings not saving

**Symptom**: Configuration resets on refresh

**Solution**:
- Check browser localStorage
- Verify no errors in console
- Clear cache and retry
- Check CORS settings

### Composio Integration

#### "No tools discovered"

**Symptom**: Composio tools don't appear

**Solution**:
1. Verify API key in settings
2. Check Composio dashboard for connected apps
3. Ensure apps have write permissions
4. Check backend logs for discovery errors

#### Tool execution fails

**Symptom**: Composio actions return errors

**Check**:
- App still connected in Composio
- Permissions haven't changed
- API quotas not exceeded
- Tool-specific requirements met

### Analytics Issues

#### Missing or incorrect data

**Symptom**: Analytics show wrong metrics

**Solution**:
- Clear browser cache
- Check timezone settings
- Verify backend connectivity
- Review calculation logic

#### Cost calculations wrong

**Symptom**: Costs don't match actual usage

**Solution**:
- Update pricing data
- Check token counting
- Verify model identification
- Review span extraction

### Deployment Issues

#### Frontend builds fail

**Symptom**: Vercel/build errors

**Solution**:
```bash
# Test locally first
cd frontend
npm run build
npm run start
```

Common fixes:
- Update Node version
- Fix TypeScript errors
- Check environment variables
- Clear build cache

#### Backend deployment fails

**Symptom**: Render/hosting errors

**Solution**:
- Verify Python version
- Check requirements.txt
- Test locally with production settings
- Review memory limits

## Error Messages

### "asyncio.run() cannot be called from a running event loop"

**Cause**: Asyncio conflict with any-agent

**Solution**: Already handled by process isolation

### "CORS policy blocked"

**Cause**: Frontend/backend URL mismatch

**Solution**: Check backend CORS settings match frontend URL

### "WebSocket connection failed"

**Cause**: Firewall or proxy blocking

**Solution**: 
- Check WebSocket support
- Verify no proxy interference
- Use polling fallback

## Performance Optimization

### Slow workflow execution

**Optimize**:
- Use smaller models when possible
- Batch similar operations
- Enable caching
- Parallelize independent nodes

### High memory usage

**Reduce**:
- Limit concurrent executions
- Clear old execution data
- Use streaming responses
- Monitor process limits

## Debug Mode

### Enable detailed logging

**Frontend**:
```javascript
localStorage.setItem('debug', 'true');
```

**Backend**:
```bash
export LOG_LEVEL=DEBUG
python main.py
```

### Network debugging

Use browser DevTools:
- Network tab for API calls
- Console for errors
- Application tab for storage

## Getting Help

### Before asking for help

1. Check this guide
2. Search error messages
3. Review recent changes
4. Test in isolation

### Information to provide

- Error messages (full text)
- Steps to reproduce
- Environment details
- Recent changes
- Log excerpts

### Support channels

- GitHub Issues
- Documentation
- Community forums

For development setup issues, see [Development Setup](./development/setup.md).