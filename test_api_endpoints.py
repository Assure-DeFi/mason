#!/usr/bin/env python3
"""
API Endpoint Testing Script for Mason Dashboard
Tests endpoints for correct responses and error handling
"""

import json
from datetime import datetime
from playwright.sync_api import sync_playwright

BASE_URL = "http://localhost:3000"

def test_endpoints():
    """Test all API endpoints and record results"""

    results = {
        "agent_id": "API-1",
        "completed_at": datetime.utcnow().isoformat() + "Z",
        "summary": {
            "endpoints_tested": 0,
            "endpoints_passed": 0,
            "endpoints_failed": 0,
            "issues_found": 0
        },
        "endpoints": []
    }

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(base_url=BASE_URL)

        # Test 1: GET /api/health
        print("Testing GET /api/health...")
        endpoint_result = test_health_endpoint(context)
        results["endpoints"].append(endpoint_result)
        results["summary"]["endpoints_tested"] += 1

        # Test 2: POST /api/setup/migrations
        print("Testing POST /api/setup/migrations...")
        endpoint_result = test_migrations_endpoint(context)
        results["endpoints"].append(endpoint_result)
        results["summary"]["endpoints_tested"] += 1

        # Test 3: GET /api/v1/backlog/next
        print("Testing GET /api/v1/backlog/next...")
        endpoint_result = test_backlog_next_endpoint(context)
        results["endpoints"].append(endpoint_result)
        results["summary"]["endpoints_tested"] += 1

        # Test 4: GET /api/keys
        print("Testing GET /api/keys...")
        endpoint_result = test_keys_endpoint(context)
        results["endpoints"].append(endpoint_result)
        results["summary"]["endpoints_tested"] += 1

        browser.close()

    # Calculate summary
    for endpoint in results["endpoints"]:
        if endpoint["status"] == "pass":
            results["summary"]["endpoints_passed"] += 1
        else:
            results["summary"]["endpoints_failed"] += 1
        results["summary"]["issues_found"] += len(endpoint.get("issues", []))

    return results

def test_health_endpoint(context):
    """Test GET /api/health"""
    endpoint = {
        "path": "/api/health",
        "method": "GET",
        "status": "pass",
        "response_code": None,
        "response_body_preview": "",
        "issues": []
    }

    try:
        response = context.request.get("/api/health")
        endpoint["response_code"] = response.status

        try:
            body = response.json()
            preview = json.dumps(body)[:200]
        except:
            body_text = response.text()
            preview = body_text[:200]

        endpoint["response_body_preview"] = preview

        # Expected: 200 OK with health status OR 404 if not implemented
        if response.status == 200:
            endpoint["status"] = "pass"
        elif response.status == 404:
            endpoint["status"] = "pass"
            endpoint["issues"].append({
                "type": "unexpected_status",
                "severity": "low",
                "description": "Health endpoint not implemented (404)",
                "expected": "200 OK or health status",
                "actual": "404 Not Found"
            })
        else:
            endpoint["status"] = "fail"
            endpoint["issues"].append({
                "type": "unexpected_status",
                "severity": "medium",
                "description": f"Unexpected status code: {response.status}",
                "expected": "200 or 404",
                "actual": str(response.status)
            })

    except Exception as e:
        endpoint["status"] = "fail"
        endpoint["issues"].append({
            "type": "error",
            "severity": "high",
            "description": f"Request failed: {str(e)}",
            "expected": "Successful HTTP request",
            "actual": f"Exception: {str(e)}"
        })

    return endpoint

def test_migrations_endpoint(context):
    """Test POST /api/setup/migrations (without auth)"""
    endpoint = {
        "path": "/api/setup/migrations",
        "method": "POST",
        "status": "pass",
        "response_code": None,
        "response_body_preview": "",
        "issues": []
    }

    try:
        response = context.request.post("/api/setup/migrations")
        endpoint["response_code"] = response.status

        try:
            body = response.json()
            preview = json.dumps(body)[:200]
        except:
            body_text = response.text()
            preview = body_text[:200]

        endpoint["response_body_preview"] = preview

        # Expected: 401 Unauthorized OR 400/500 with error message (no auth provided)
        if response.status in [400, 401, 403, 500]:
            endpoint["status"] = "pass"
            # Check if response has error message
            try:
                body = response.json()
                if "error" not in body and "message" not in body:
                    endpoint["issues"].append({
                        "type": "invalid_response",
                        "severity": "low",
                        "description": "Error response missing error/message field",
                        "expected": "JSON with 'error' or 'message' field",
                        "actual": preview
                    })
            except:
                pass
        elif response.status == 200:
            # This might be OK if migrations don't require auth (setup phase)
            endpoint["status"] = "pass"
        else:
            endpoint["status"] = "fail"
            endpoint["issues"].append({
                "type": "unexpected_status",
                "severity": "medium",
                "description": f"Unexpected status code: {response.status}",
                "expected": "400, 401, 403, 500, or 200",
                "actual": str(response.status)
            })

    except Exception as e:
        endpoint["status"] = "fail"
        endpoint["issues"].append({
            "type": "error",
            "severity": "high",
            "description": f"Request failed: {str(e)}",
            "expected": "Successful HTTP request",
            "actual": f"Exception: {str(e)}"
        })

    return endpoint

def test_backlog_next_endpoint(context):
    """Test GET /api/v1/backlog/next (without auth)"""
    endpoint = {
        "path": "/api/v1/backlog/next",
        "method": "GET",
        "status": "pass",
        "response_code": None,
        "response_body_preview": "",
        "issues": []
    }

    try:
        response = context.request.get("/api/v1/backlog/next")
        endpoint["response_code"] = response.status

        try:
            body = response.json()
            preview = json.dumps(body)[:200]
        except:
            body_text = response.text()
            preview = body_text[:200]

        endpoint["response_body_preview"] = preview

        # Expected: 401 Unauthorized (protected endpoint)
        if response.status == 401:
            endpoint["status"] = "pass"
            # Verify error message exists
            try:
                body = response.json()
                if "error" not in body and "message" not in body:
                    endpoint["issues"].append({
                        "type": "invalid_response",
                        "severity": "low",
                        "description": "401 response missing error message",
                        "expected": "JSON with 'error' or 'message' field",
                        "actual": preview
                    })
            except:
                pass
        elif response.status == 200:
            endpoint["status"] = "fail"
            endpoint["issues"].append({
                "type": "unexpected_status",
                "severity": "critical",
                "description": "Protected endpoint accessible without authentication",
                "expected": "401 Unauthorized",
                "actual": "200 OK - SECURITY ISSUE"
            })
        else:
            endpoint["status"] = "fail"
            endpoint["issues"].append({
                "type": "unexpected_status",
                "severity": "medium",
                "description": f"Unexpected status code: {response.status}",
                "expected": "401",
                "actual": str(response.status)
            })

    except Exception as e:
        endpoint["status"] = "fail"
        endpoint["issues"].append({
            "type": "error",
            "severity": "high",
            "description": f"Request failed: {str(e)}",
            "expected": "Successful HTTP request",
            "actual": f"Exception: {str(e)}"
        })

    return endpoint

def test_keys_endpoint(context):
    """Test GET /api/keys (without auth)"""
    endpoint = {
        "path": "/api/keys",
        "method": "GET",
        "status": "pass",
        "response_code": None,
        "response_body_preview": "",
        "issues": []
    }

    try:
        response = context.request.get("/api/keys")
        endpoint["response_code"] = response.status

        try:
            body = response.json()
            preview = json.dumps(body)[:200]
        except:
            body_text = response.text()
            preview = body_text[:200]

        endpoint["response_body_preview"] = preview

        # Expected: 401 Unauthorized (protected endpoint)
        if response.status == 401:
            endpoint["status"] = "pass"
            # Verify error message exists
            try:
                body = response.json()
                if "error" not in body and "message" not in body:
                    endpoint["issues"].append({
                        "type": "invalid_response",
                        "severity": "low",
                        "description": "401 response missing error message",
                        "expected": "JSON with 'error' or 'message' field",
                        "actual": preview
                    })
            except:
                pass
        elif response.status == 200:
            endpoint["status"] = "fail"
            endpoint["issues"].append({
                "type": "unexpected_status",
                "severity": "critical",
                "description": "Protected endpoint accessible without authentication",
                "expected": "401 Unauthorized",
                "actual": "200 OK - SECURITY ISSUE"
            })
        else:
            endpoint["status"] = "fail"
            endpoint["issues"].append({
                "type": "unexpected_status",
                "severity": "medium",
                "description": f"Unexpected status code: {response.status}",
                "expected": "401",
                "actual": str(response.status)
            })

    except Exception as e:
        endpoint["status"] = "fail"
        endpoint["issues"].append({
            "type": "error",
            "severity": "high",
            "description": f"Request failed: {str(e)}",
            "expected": "Successful HTTP request",
            "actual": f"Exception: {str(e)}"
        })

    return endpoint

if __name__ == "__main__":
    print(f"Starting API endpoint tests against {BASE_URL}...")
    print("=" * 60)

    results = test_endpoints()

    print("\n" + "=" * 60)
    print("RESULTS SUMMARY:")
    print(f"Endpoints tested: {results['summary']['endpoints_tested']}")
    print(f"Endpoints passed: {results['summary']['endpoints_passed']}")
    print(f"Endpoints failed: {results['summary']['endpoints_failed']}")
    print(f"Issues found: {results['summary']['issues_found']}")
    print("=" * 60)

    # Write results to file
    output_path = ".claude/battle-test/results/API-1.json"
    with open(output_path, "w") as f:
        json.dump(results, f, indent=2)

    print(f"\nResults written to: {output_path}")

    # Exit with error code if any endpoints failed
    exit(0 if results['summary']['endpoints_failed'] == 0 else 1)
