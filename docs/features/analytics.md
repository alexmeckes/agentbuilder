# Analytics Dashboard

The Analytics Dashboard provides comprehensive insights into your workflow executions, costs, and performance metrics.

## Overview

Track and analyze all aspects of your AI workflows with real-time metrics, historical trends, and detailed breakdowns of costs and performance.

## Key Metrics

### Execution Statistics
- **Total Workflows**: Count of unique workflow designs
- **Total Executions**: Number of workflow runs
- **Success Rate**: Percentage of successful completions
- **Average Duration**: Mean execution time

### Cost Analysis
- **Total Cost**: Cumulative spending across all executions
- **Cost by Model**: Breakdown by AI provider
- **Cost by Workflow**: Identify expensive operations
- **Token Usage**: Input/output token consumption

### Performance Metrics
- **Execution Times**: P50, P95, P99 latencies
- **Throughput**: Executions per time period
- **Error Rates**: Failure analysis
- **Resource Usage**: API quota consumption

## Dashboard Components

### Summary Cards
Top-level metrics displayed as cards:
- Total Workflows
- Total Executions
- Success Rate
- Total Cost

### Workflow Insights
Detailed table showing:
- Workflow names and IDs
- Execution counts
- Success rates
- Average costs
- Last run times

### Framework Usage
Pie chart visualization of:
- OpenAI vs other providers
- Model distribution
- Tool usage patterns

### Category Breakdown
Workflows automatically categorized:
- Research & Analysis
- Content Generation
- Data Processing
- Automation Tasks
- Custom Categories

## Cost Tracking

### Real-time Calculation
Costs calculated using:
- LiteLLM pricing data
- Actual token usage
- Model-specific rates
- Tool execution costs

### Cost Optimization
Identify opportunities to:
- Switch to cheaper models
- Reduce token usage
- Cache repeated operations
- Batch similar tasks

### Budget Monitoring
- Set cost alerts
- Track spending trends
- Project future costs
- Compare period-over-period

## Performance Analysis

### Execution Timeline
Visualize workflow performance:
- Start and end times
- Node-level durations
- Bottleneck identification
- Parallel execution paths

### Error Analysis
Understand failures:
- Error types and frequencies
- Failed node identification
- Retry success rates
- Root cause patterns

### Optimization Insights
Recommendations for:
- Faster model alternatives
- Parallel processing opportunities
- Caching strategies
- Workflow simplification

## Filtering and Search

### Time Ranges
Filter data by:
- Last hour/day/week/month
- Custom date ranges
- Specific time periods
- Relative timeframes

### Workflow Filters
- By workflow name
- By framework
- By status (success/failure)
- By cost threshold

### Advanced Search
- Regex pattern matching
- Multi-field queries
- Saved filter sets
- Export capabilities

## Data Export

### Available Formats
- CSV for spreadsheets
- JSON for programmatic access
- PDF reports
- API access

### Included Data
- Execution details
- Cost breakdowns
- Performance metrics
- Error logs

## Integration

### Trace Viewer
Click any execution to:
- View detailed traces
- Inspect node outputs
- Analyze timing
- Debug issues

### A/B Testing
Compare metrics between:
- Different models
- Workflow variants
- Parameter settings
- Time periods

## Best Practices

### Regular Monitoring
- Check daily for anomalies
- Review weekly trends
- Monthly cost analysis
- Quarterly optimization

### Setting Alerts
Configure notifications for:
- Cost thresholds
- Error rate spikes
- Performance degradation
- Quota approaching

### Data Retention
- Real-time data: 24 hours
- Daily aggregates: 30 days
- Monthly summaries: 1 year
- Archived data: On request

## Troubleshooting

### Missing Data
- Verify workflow execution
- Check backend connectivity
- Confirm environment variables
- Review error logs

### Incorrect Costs
- Validate model configuration
- Check token counting
- Verify pricing data
- Update cost tables

### Performance Issues
- Reduce date range
- Use filtering
- Enable caching
- Optimize queries

For execution details, see [Trace Viewer](./trace-viewer.md).