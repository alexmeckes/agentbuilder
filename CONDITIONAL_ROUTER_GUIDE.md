# Conditional Router Node Guide

The Conditional Router Node allows you to create branching logic in your workflows based on data conditions. It evaluates JSON data using JSONPath expressions and routes the workflow to different paths based on the results.

## Features

- **5 Operators**: `equals`, `contains`, `not_equals`, `greater_than`, `less_than`
- **JSONPath Support**: Query complex nested data structures
- **Multiple Conditions**: Define multiple routing paths with priority order
- **Default Fallback**: Always includes a default path for unmatched conditions
- **Performance Optimized**: Fast evaluation for real-time workflows

## How It Works

1. **Input Data**: Receives JSON data from previous nodes
2. **Condition Evaluation**: Tests each condition in order using JSONPath queries
3. **First Match Wins**: Routes to the first condition that evaluates to `true`
4. **Default Fallback**: Uses default path if no conditions match

## Supported Operators

### `equals` - Exact Match
```json
{
  "jsonpath": "$.user.status",
  "operator": "equals", 
  "value": "active"
}
```
**Use Cases**: User status, exact string matching, boolean checks

### `contains` - Substring Search
```json
{
  "jsonpath": "$.message",
  "operator": "contains",
  "value": "urgent"
}
```
**Use Cases**: Text analysis, keyword detection, partial matches

### `not_equals` - Inequality Check
```json
{
  "jsonpath": "$.account.type",
  "operator": "not_equals",
  "value": "guest"
}
```
**Use Cases**: Exclusion logic, inverse conditions

### `greater_than` - Numeric/String Comparison
```json
{
  "jsonpath": "$.order.value",
  "operator": "greater_than",
  "value": "100"
}
```
**Use Cases**: Thresholds, scoring, priority levels, version comparison

### `less_than` - Numeric/String Comparison
```json
{
  "jsonpath": "$.user.age",
  "operator": "less_than",
  "value": "18"
}
```
**Use Cases**: Limits, restrictions, capacity checks

## JSONPath Examples

### Basic Access
- `$.user` - Root level property
- `$.user.name` - Nested property
- `$.preferences.theme` - Deep nesting

### Array Access
- `$.tags[0]` - First array element
- `$.users[*].status` - All user statuses
- `$.items[-1]` - Last array element

### Complex Queries
- `$.users[?(@.active == true)]` - Filter active users
- `$.orders[?(@.value > 100)]` - High-value orders
- `$.events[?(@.type == 'error')]` - Error events

## Real-World Examples

### 1. E-commerce Order Processing

**Scenario**: Route orders based on value and customer tier

**Input Data**:
```json
{
  "order_id": "ORD-12345",
  "customer_tier": "gold",
  "order_value": 250,
  "region": "US",
  "items": ["laptop", "mouse"]
}
```

**Conditions**:
1. **High Value Orders** (>$200): `$.order_value` `greater_than` `200` → VIP Processing
2. **Gold Customers**: `$.customer_tier` `equals` `gold` → Priority Processing  
3. **International**: `$.region` `not_equals` `US` → International Processing
4. **Default**: Standard Processing

### 2. User Authentication Flow

**Scenario**: Route users based on account status and security

**Input Data**:
```json
{
  "user_id": "user123",
  "account_status": "active",
  "email_verified": true,
  "login_attempts": 2,
  "last_login": "2024-01-15"
}
```

**Conditions**:
1. **Security Check**: `$.login_attempts` `greater_than` `3` → Security Review
2. **Inactive Account**: `$.account_status` `not_equals` `active` → Account Recovery
3. **Unverified Email**: `$.email_verified` `equals` `false` → Email Verification
4. **Default**: Normal Login Flow

### 3. Content Moderation

**Scenario**: Route content based on safety and type

**Input Data**:
```json
{
  "content_id": "post456",
  "content_type": "video",
  "safety_score": 0.85,
  "user_reports": 1,
  "keywords": ["family", "vacation"]
}
```

**Conditions**:
1. **Low Safety**: `$.safety_score` `less_than` `0.7` → Manual Review
2. **Multiple Reports**: `$.user_reports` `greater_than` `3` → Priority Review
3. **Video Content**: `$.content_type` `contains` `video` → Video Processing
4. **Default**: Auto Approve

### 4. Customer Support Routing

**Scenario**: Route support tickets by priority and type

**Input Data**:
```json
{
  "ticket_id": "T-789",
  "priority": "high",
  "category": "billing",
  "customer_tier": "enterprise",
  "issue_keywords": ["payment", "failed", "urgent"]
}
```

**Conditions**:
1. **Critical Issues**: `$.priority` `equals` `critical` → Emergency Team
2. **Enterprise Customers**: `$.customer_tier` `equals` `enterprise` → Enterprise Support
3. **Billing Issues**: `$.category` `contains` `billing` → Billing Team
4. **Default**: General Support

## Best Practices

### 1. Condition Order Matters
- Place most specific conditions first
- Use broader conditions later
- Always include a default path

### 2. JSONPath Tips
- Test JSONPath expressions beforehand
- Use online JSONPath testers for complex queries
- Handle missing data gracefully

### 3. Performance Optimization
- Keep conditions simple when possible
- Avoid complex nested queries for high-volume workflows
- Test with realistic data sizes

### 4. Error Handling
- Always provide meaningful condition names
- Use descriptive values that are easy to debug
- Test edge cases (missing fields, null values)

## Frontend Usage

### Adding a Conditional Router
1. Drag "Conditional Router" from the node palette
2. Connect input from previous node
3. Click "Edit" to configure conditions
4. Add conditions using the modal editor
5. Connect output paths to subsequent nodes

### Visual Configuration
- **Collapsed View**: Shows summary of conditions
- **Expanded View**: Shows all conditions with inline editing
- **Modal Editor**: Full-featured condition editor
- **Handle Management**: Automatic output handles for each condition

### Connection Patterns
```
[Input Node] → [Conditional Router] → [Output Node A]
                                   → [Output Node B]
                                   → [Default Output]
```

## Testing Your Conditions

Use the test scripts provided in the project:

```bash
# Basic functionality test
cd backend && source venv/bin/activate
python ../test_conditional_router.py

# Comprehensive test with all operators
python ../test_conditional_router_enhanced.py
```

## Troubleshooting

### Common Issues

**Condition never matches**:
- Check JSONPath syntax
- Verify data structure
- Test with simple conditions first

**Wrong data type comparison**:
- Numbers are compared as strings by default
- Use appropriate operators for your data types
- Test with sample data

**Performance issues**:
- Simplify complex JSONPath queries
- Reduce number of conditions
- Consider caching for repeated evaluations

### Debug Tips

1. **Enable logging** in the backend for condition evaluation details
2. **Use simple test data** to verify condition logic
3. **Test edge cases** like missing fields or null values
4. **Validate JSONPath** using online tools before implementation

## Advanced Usage

### Complex JSONPath Queries
```json
{
  "jsonpath": "$.users[?(@.active == true && @.role == 'admin')].length",
  "operator": "greater_than",
  "value": "0"
}
```

### Dynamic Condition Values
For advanced use cases, consider using template variables or computed values in your workflow logic.

### Integration with Other Nodes
- **Before**: Data transformation nodes to prepare data
- **After**: Different processing paths based on routing decisions
- **Parallel**: Multiple conditional routers for complex decision trees

---

**Ready to use Conditional Router in your workflows!** 🎯

The conditional router provides powerful branching logic for building sophisticated AI agent workflows. Test it thoroughly with your specific use cases and data structures. 