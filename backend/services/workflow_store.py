"""
Workflow storage and analytics service.

This is a placeholder implementation that will be replaced with a proper
database-backed storage solution in the future.
"""
import json
import os
import time
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional


class WorkflowStore:
    """
    Service for storing and retrieving workflow execution data and analytics.
    
    This is currently a placeholder implementation with in-memory storage.
    In production, this should be replaced with a proper database solution
    (PostgreSQL, MongoDB, etc.)
    """
    
    def __init__(self):
        # In-memory storage for development
        self.executions = []
        self.workflows = {}
        
        # File-based persistence disabled for production
        # TODO: Replace with database storage (PostgreSQL, Redis, etc.)
        # self.storage_file = "workflow_store.json"
        # self._load_from_file()
    
    def _load_from_file(self):
        """Load stored data from file if it exists"""
        if os.path.exists(self.storage_file):
            try:
                with open(self.storage_file, 'r') as f:
                    data = json.load(f)
                    self.executions = data.get('executions', [])
                    self.workflows = data.get('workflows', {})
            except Exception as e:
                print(f"Error loading workflow store: {e}")
    
    def _save_to_file(self):
        """Save data to file for persistence"""
        try:
            data = {
                'executions': self.executions[-1000:],  # Keep only last 1000 executions
                'workflows': self.workflows
            }
            with open(self.storage_file, 'w') as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            print(f"Error saving workflow store: {e}")
    
    def add_execution(self, execution_data: Dict[str, Any]):
        """Add a new execution record"""
        self.executions.append(execution_data)
        print(f"📊 WorkflowStore: Added execution {execution_data.get('execution_id')} - Total executions in memory: {len(self.executions)}")
        # Disabled file saving for production - data stays in memory only
        # self._save_to_file()
    
    def get_workflow_analytics(self, user_id: Optional[str] = None, 
                              start_date: Optional[datetime] = None,
                              end_date: Optional[datetime] = None,
                              workflow_id: Optional[str] = None) -> Dict[str, Any]:
        """Get workflow analytics with optional filtering"""
        print(f"📊 WorkflowStore: Getting analytics - Total executions in memory: {len(self.executions)}")
        if self.executions:
            print(f"📊 WorkflowStore: Sample execution: {self.executions[0].get('execution_id')} - user: {self.executions[0].get('user_id')}")
        filtered_executions = self.executions
        
        # Apply filters
        if user_id:
            print(f"📊 WorkflowStore: Filtering by user_id={user_id}")
            filtered_executions = [e for e in filtered_executions if e.get('user_id') == user_id]
            print(f"📊 WorkflowStore: After user filter: {len(filtered_executions)} executions")
        
        if start_date:
            start_timestamp = start_date.timestamp()
            print(f"📊 WorkflowStore: Filtering by start_date={start_date} (timestamp={start_timestamp})")
            before_count = len(filtered_executions)
            filtered_executions = [e for e in filtered_executions 
                                 if e.get('created_at', 0) >= start_timestamp]
            print(f"📊 WorkflowStore: Date filter removed {before_count - len(filtered_executions)} executions")
        
        if end_date:
            end_timestamp = end_date.timestamp()
            filtered_executions = [e for e in filtered_executions 
                                 if e.get('created_at', 0) <= end_timestamp]
        
        if workflow_id:
            filtered_executions = [e for e in filtered_executions 
                                 if e.get('workflow_id') == workflow_id]
        
        # Calculate analytics
        total_executions = len(filtered_executions)
        successful_executions = len([e for e in filtered_executions 
                                   if e.get('status') == 'completed'])
        failed_executions = len([e for e in filtered_executions 
                              if e.get('status') == 'failed'])
        
        # Calculate average execution time
        execution_times = [e.get('execution_time', 0) for e in filtered_executions 
                         if e.get('execution_time')]
        avg_execution_time = sum(execution_times) / len(execution_times) if execution_times else 0
        
        # Calculate total cost
        total_cost = sum(e.get('cost_info', {}).get('total_cost', 0) 
                        for e in filtered_executions)
        
        # Group by workflow
        workflows_summary = {}
        for execution in filtered_executions:
            workflow_name = execution.get('workflow_name', 'Unknown')
            if workflow_name not in workflows_summary:
                workflows_summary[workflow_name] = {
                    'count': 0,
                    'successful': 0,
                    'failed': 0,
                    'total_cost': 0,
                    'avg_execution_time': 0,
                    'execution_times': []
                }
            
            workflows_summary[workflow_name]['count'] += 1
            if execution.get('status') == 'completed':
                workflows_summary[workflow_name]['successful'] += 1
            elif execution.get('status') == 'failed':
                workflows_summary[workflow_name]['failed'] += 1
            
            workflows_summary[workflow_name]['total_cost'] += execution.get('cost_info', {}).get('total_cost', 0)
            if execution.get('execution_time'):
                workflows_summary[workflow_name]['execution_times'].append(execution['execution_time'])
        
        # Calculate average execution times for each workflow
        for workflow_name, summary in workflows_summary.items():
            if summary['execution_times']:
                summary['avg_execution_time'] = sum(summary['execution_times']) / len(summary['execution_times'])
            del summary['execution_times']  # Remove raw data
        
        return {
            'total_executions': total_executions,
            'successful_executions': successful_executions,
            'failed_executions': failed_executions,
            'success_rate': successful_executions / total_executions if total_executions > 0 else 0,
            'avg_execution_time': avg_execution_time,
            'total_cost': total_cost,
            'workflows': workflows_summary,
            'time_range': {
                'start': start_date.isoformat() if start_date else None,
                'end': end_date.isoformat() if end_date else None
            }
        }
    
    def get_recent_executions(self, workflow_id: Optional[str] = None,
                            user_id: Optional[str] = None,
                            limit: int = 10) -> List[Dict[str, Any]]:
        """Get recent executions with optional filtering"""
        filtered = self.executions
        
        if workflow_id:
            filtered = [e for e in filtered if e.get('workflow_id') == workflow_id]
        
        if user_id:
            filtered = [e for e in filtered if e.get('user_id') == user_id]
        
        # Sort by created_at descending and limit
        filtered.sort(key=lambda x: x.get('created_at', 0), reverse=True)
        return filtered[:limit]
    
    def get_executions_with_decisions(self, workflow_id: Optional[str] = None,
                                    user_id: Optional[str] = None,
                                    start_date: Optional[datetime] = None,
                                    end_date: Optional[datetime] = None) -> List[Dict[str, Any]]:
        """Get executions that contain decision nodes"""
        filtered = self.executions
        
        # Apply filters
        if workflow_id:
            filtered = [e for e in filtered if e.get('workflow_id') == workflow_id]
        
        if user_id:
            filtered = [e for e in filtered if e.get('user_id') == user_id]
        
        if start_date:
            start_timestamp = start_date.timestamp()
            filtered = [e for e in filtered if e.get('created_at', 0) >= start_timestamp]
        
        if end_date:
            end_timestamp = end_date.timestamp()
            filtered = [e for e in filtered if e.get('created_at', 0) <= end_timestamp]
        
        # Filter for executions with decision nodes
        decision_executions = []
        for execution in filtered:
            trace = execution.get('trace', {})
            # Check if execution has decision-related data
            if 'decisions' in trace or any('condition' in str(trace).lower()):
                decision_executions.append(execution)
        
        return decision_executions
    
    def get_comprehensive_analytics(self, user_id: Optional[str] = None,
                                  workflow_id: Optional[str] = None) -> Dict[str, Any]:
        """Get comprehensive analytics data"""
        # Get basic analytics
        analytics = self.get_workflow_analytics(user_id=user_id, workflow_id=workflow_id)
        
        # Add additional metrics
        filtered = self.executions
        if user_id:
            filtered = [e for e in filtered if e.get('user_id') == user_id]
        if workflow_id:
            filtered = [e for e in filtered if e.get('workflow_id') == workflow_id]
        
        # Error analysis
        errors = {}
        for execution in filtered:
            if execution.get('status') == 'failed':
                error_type = execution.get('error_details', {}).get('error_type', 'Unknown')
                errors[error_type] = errors.get(error_type, 0) + 1
        
        analytics['error_analysis'] = errors
        
        # Time-based trends (last 7 days)
        now = datetime.now()
        daily_stats = {}
        for i in range(7):
            day = now - timedelta(days=i)
            day_str = day.strftime('%Y-%m-%d')
            day_start = day.replace(hour=0, minute=0, second=0).timestamp()
            day_end = day.replace(hour=23, minute=59, second=59).timestamp()
            
            day_executions = [e for e in filtered 
                            if day_start <= e.get('created_at', 0) <= day_end]
            
            daily_stats[day_str] = {
                'total': len(day_executions),
                'successful': len([e for e in day_executions if e.get('status') == 'completed']),
                'failed': len([e for e in day_executions if e.get('status') == 'failed']),
                'cost': sum(e.get('cost_info', {}).get('total_cost', 0) for e in day_executions)
            }
        
        analytics['daily_trends'] = daily_stats
        
        return analytics
    
    def get_performance_metrics(self, user_id: Optional[str] = None,
                              workflow_id: Optional[str] = None,
                              start_date: Optional[datetime] = None,
                              end_date: Optional[datetime] = None) -> Dict[str, Any]:
        """Get detailed performance metrics"""
        filtered = self.executions
        
        # Apply filters
        if user_id:
            filtered = [e for e in filtered if e.get('user_id') == user_id]
        
        if workflow_id:
            filtered = [e for e in filtered if e.get('workflow_id') == workflow_id]
        
        if start_date:
            start_timestamp = start_date.timestamp()
            filtered = [e for e in filtered if e.get('created_at', 0) >= start_timestamp]
        
        if end_date:
            end_timestamp = end_date.timestamp()
            filtered = [e for e in filtered if e.get('created_at', 0) <= end_timestamp]
        
        # Calculate performance metrics
        execution_times = [e.get('execution_time', 0) for e in filtered if e.get('execution_time')]
        
        metrics = {
            'total_executions': len(filtered),
            'avg_execution_time': sum(execution_times) / len(execution_times) if execution_times else 0,
            'min_execution_time': min(execution_times) if execution_times else 0,
            'max_execution_time': max(execution_times) if execution_times else 0,
            'p50_execution_time': 0,
            'p95_execution_time': 0,
            'p99_execution_time': 0
        }
        
        # Calculate percentiles
        if execution_times:
            sorted_times = sorted(execution_times)
            n = len(sorted_times)
            metrics['p50_execution_time'] = sorted_times[int(n * 0.5)]
            metrics['p95_execution_time'] = sorted_times[int(n * 0.95)] if n > 20 else sorted_times[-1]
            metrics['p99_execution_time'] = sorted_times[int(n * 0.99)] if n > 100 else sorted_times[-1]
        
        # Node-level performance
        node_metrics = {}
        for execution in filtered:
            trace = execution.get('trace', {})
            spans = trace.get('spans', [])
            
            for span in spans:
                node_name = span.get('name', '')
                if node_name.startswith('Node:'):
                    node_id = node_name.replace('Node:', '').strip()
                    if node_id not in node_metrics:
                        node_metrics[node_id] = {
                            'count': 0,
                            'total_time': 0,
                            'times': []
                        }
                    
                    duration = 0
                    if span.get('start_time') and span.get('end_time'):
                        duration = (span['end_time'] - span['start_time']) / 1_000_000  # Convert to ms
                    
                    node_metrics[node_id]['count'] += 1
                    node_metrics[node_id]['total_time'] += duration
                    node_metrics[node_id]['times'].append(duration)
        
        # Calculate node averages
        for node_id, data in node_metrics.items():
            if data['times']:
                data['avg_time'] = data['total_time'] / data['count']
                data['min_time'] = min(data['times'])
                data['max_time'] = max(data['times'])
                del data['times']  # Remove raw data
        
        metrics['node_performance'] = node_metrics
        
        return metrics