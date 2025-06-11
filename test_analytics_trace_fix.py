#!/usr/bin/env python3
"""
Test script to verify analytics trace data extraction fix
"""

import sys
import os
import json
import logging
from typing import Dict, Any

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def create_mock_trace_data() -> Dict[str, Any]:
    """Create mock trace data that mimics what any-agent returns"""
    return {
        "final_output": "Test workflow completed successfully",
        "spans": [
            {
                "name": "test_llm_call",
                "span_id": "span_001",
                "trace_id": "trace_001", 
                "start_time": 1000000000,
                "end_time": 1002000000,
                "duration_ms": 2000,
                "status": "completed",
                "attributes": {
                    # OpenInference convention (what any-agent actually uses)
                    "llm.model_name": "gpt-4o-mini",
                    "llm.token_count.prompt": 150,
                    "llm.token_count.completion": 75,
                    "cost_prompt": 0.00015,
                    "cost_completion": 0.000225,
                    "openinference.span.kind": "LLM"
                },
                "events": [],
                "kind": "LLM"
            },
            {
                "name": "web_search_tool",
                "span_id": "span_002", 
                "trace_id": "trace_001",
                "start_time": 1002000000,
                "end_time": 1003500000,
                "duration_ms": 1500,
                "status": "completed",
                "attributes": {
                    "tool.name": "search_web",
                    "input.value": "test query",
                    "output.value": "search results",
                    "openinference.span.kind": "TOOL"
                },
                "events": [],
                "kind": "TOOL"
            }
        ],
        "performance": {
            "total_duration_ms": 3500,
            "total_cost": 0.000375,
            "total_tokens": 225
        },
        "cost_info": {
            "total_cost": 0.000375,
            "total_tokens": 225,
            "input_tokens": 150,
            "output_tokens": 75
        }
    }

def test_backend_extraction():
    """Test the backend main.py extraction methods"""
    logger.info("🧪 Testing backend trace extraction methods...")
    
    try:
        from main import WorkflowExecutor
        
        # Create test executor
        executor = WorkflowExecutor()
        
        # Test data with OpenInference attributes
        mock_trace = create_mock_trace_data()
        
        # Test cost extraction
        logger.info("Testing _extract_cost_info_from_trace...")
        cost_info = executor._extract_cost_info_from_trace(mock_trace)
        logger.info(f"Extracted cost info: {cost_info}")
        
        # Test performance extraction  
        logger.info("Testing _extract_performance_metrics...")
        performance = executor._extract_performance_metrics(mock_trace, 3.5)
        logger.info(f"Extracted performance: {performance}")
        
        # Test spans extraction
        logger.info("Testing _extract_spans_from_trace...")
        spans = executor._extract_spans_from_trace(mock_trace)
        logger.info(f"Extracted {len(spans)} spans")
        
        # Verify results
        success = True
        if cost_info.get("total_cost", 0) == 0:
            logger.error("❌ Cost extraction failed - total_cost is 0")
            success = False
        else:
            logger.info(f"✅ Cost extraction successful: ${cost_info['total_cost']:.6f}")
            
        if cost_info.get("total_tokens", 0) == 0:
            logger.error("❌ Token extraction failed - total_tokens is 0") 
            success = False
        else:
            logger.info(f"✅ Token extraction successful: {cost_info['total_tokens']} tokens")
            
        if len(spans) == 0:
            logger.error("❌ Spans extraction failed - no spans found")
            success = False
        else:
            logger.info(f"✅ Spans extraction successful: {len(spans)} spans")
            
        return success
        
    except Exception as e:
        logger.error(f"❌ Backend extraction test failed: {e}")
        return False

def test_translator_extraction():
    """Test the visual_to_anyagent_translator.py extraction"""
    logger.info("🧪 Testing translator trace extraction...")
    
    try:
        from visual_to_anyagent_translator import _extract_trace_from_result
        
        # Create a mock result object with OpenInference attributes
        class MockResult:
            def __init__(self):
                self.final_output = "Test workflow completed"
                self.spans = [MockSpan()]
                
        class MockSpan:
            def __init__(self):
                self.name = "test_span"
                self.span_id = "span_001"
                self.trace_id = "trace_001"
                self.start_time = 1000000000
                self.end_time = 1002000000
                self.status = "completed"
                self.attributes = {
                    "llm.model_name": "gpt-4o-mini",
                    "llm.token_count.prompt": 100,
                    "llm.token_count.completion": 50,
                    "cost_prompt": 0.0001,
                    "cost_completion": 0.00015,
                    "openinference.span.kind": "LLM"
                }
                self.events = []
                self.kind = "LLM"
        
        mock_result = MockResult()
        
        # Test extraction
        trace_data = _extract_trace_from_result(mock_result)
        logger.info(f"Extracted trace data keys: {trace_data.keys()}")
        
        # Verify results
        success = True
        cost_info = trace_data.get("cost_info", {})
        performance = trace_data.get("performance", {})
        spans = trace_data.get("spans", [])
        
        if cost_info.get("total_cost", 0) == 0:
            logger.error("❌ Translator cost extraction failed")
            success = False
        else:
            logger.info(f"✅ Translator cost extraction: ${cost_info['total_cost']:.6f}")
            
        if cost_info.get("total_tokens", 0) == 0:
            logger.error("❌ Translator token extraction failed")
            success = False  
        else:
            logger.info(f"✅ Translator token extraction: {cost_info['total_tokens']} tokens")
            
        if len(spans) == 0:
            logger.error("❌ Translator spans extraction failed")
            success = False
        else:
            logger.info(f"✅ Translator spans extraction: {len(spans)} spans")
            
        return success
        
    except Exception as e:
        logger.error(f"❌ Translator extraction test failed: {e}")
        return False

def test_attribute_mapping():
    """Test specific attribute mapping scenarios"""
    logger.info("🧪 Testing attribute mapping scenarios...")
    
    test_cases = [
        {
            "name": "OpenInference only",
            "attributes": {
                "llm.token_count.prompt": 100,
                "llm.token_count.completion": 50, 
                "cost_prompt": 0.0001,
                "cost_completion": 0.00015
            },
            "expected_tokens": 150,
            "expected_cost": 0.00025
        },
        {
            "name": "GenAI only", 
            "attributes": {
                "gen_ai.usage.input_tokens": 200,
                "gen_ai.usage.output_tokens": 100,
                "gen_ai.usage.input_cost": 0.0002,
                "gen_ai.usage.output_cost": 0.0003
            },
            "expected_tokens": 300,
            "expected_cost": 0.0005
        },
        {
            "name": "Mixed (GenAI should take precedence)",
            "attributes": {
                "gen_ai.usage.input_tokens": 200,
                "gen_ai.usage.output_tokens": 100,
                "gen_ai.usage.input_cost": 0.0002,
                "gen_ai.usage.output_cost": 0.0003,
                "llm.token_count.prompt": 50,  # Should be ignored
                "llm.token_count.completion": 25,  # Should be ignored
                "cost_prompt": 0.00005,  # Should be ignored
                "cost_completion": 0.00007  # Should be ignored
            },
            "expected_tokens": 300,
            "expected_cost": 0.0005
        }
    ]
    
    try:
        from main import WorkflowExecutor
        executor = WorkflowExecutor()
        
        all_passed = True
        
        for case in test_cases:
            logger.info(f"Testing: {case['name']}")
            
            # Create mock trace with test attributes
            mock_trace = {
                "spans": [{
                    "attributes": case["attributes"]
                }]
            }
            
            # Extract cost info
            result = executor._extract_cost_info_from_trace(mock_trace)
            
            # Check results
            actual_tokens = result.get("total_tokens", 0)
            actual_cost = result.get("total_cost", 0)
            
            if actual_tokens == case["expected_tokens"]:
                logger.info(f"  ✅ Tokens: {actual_tokens} (expected {case['expected_tokens']})")
            else:
                logger.error(f"  ❌ Tokens: {actual_tokens} (expected {case['expected_tokens']})")
                all_passed = False
                
            if abs(actual_cost - case["expected_cost"]) < 0.000001:
                logger.info(f"  ✅ Cost: ${actual_cost:.6f} (expected ${case['expected_cost']:.6f})")
            else:
                logger.error(f"  ❌ Cost: ${actual_cost:.6f} (expected ${case['expected_cost']:.6f})")
                all_passed = False
        
        return all_passed
        
    except Exception as e:
        logger.error(f"❌ Attribute mapping test failed: {e}")
        return False

def main():
    """Run all tests"""
    logger.info("🚀 Starting Analytics Trace Data Fix Tests")
    logger.info("=" * 60)
    
    results = {}
    
    # Test 1: Backend extraction
    results["backend"] = test_backend_extraction()
    logger.info("")
    
    # Test 2: Translator extraction  
    results["translator"] = test_translator_extraction()
    logger.info("")
    
    # Test 3: Attribute mapping
    results["mapping"] = test_attribute_mapping()
    logger.info("")
    
    # Summary
    logger.info("=" * 60)
    logger.info("📊 TEST RESULTS SUMMARY")
    logger.info("=" * 60)
    
    all_passed = True
    for test_name, passed in results.items():
        status = "✅ PASSED" if passed else "❌ FAILED"
        logger.info(f"{test_name.upper()} EXTRACTION: {status}")
        if not passed:
            all_passed = False
    
    logger.info("")
    if all_passed:
        logger.info("🎉 ALL TESTS PASSED! Analytics trace data extraction should work.")
        logger.info("💡 Try running a workflow in the UI to verify cost/tokens/spans appear.")
    else:
        logger.info("❌ SOME TESTS FAILED. Check the logs above for details.")
        
    return all_passed

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)