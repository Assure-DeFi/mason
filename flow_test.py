#!/usr/bin/env python3
"""
Flow Tester for Mason Dashboard
Tests user journeys and navigation flows
"""

from playwright.sync_api import sync_playwright, expect
import json
from datetime import datetime
import time

BASE_URL = "http://localhost:3000"

def test_flows():
    results = {
        "agent_id": "FLOW-1",
        "completed_at": datetime.utcnow().isoformat() + "Z",
        "summary": {
            "flows_tested": 0,
            "flows_passed": 0,
            "flows_failed": 0,
            "issues_found": 0
        },
        "flows": []
    }

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1920, 'height': 1080})
        page = context.new_page()

        # Enable console logging
        page.on("console", lambda msg: print(f"[CONSOLE {msg.type}] {msg.text}"))
        page.on("pageerror", lambda err: print(f"[PAGE ERROR] {err}"))

        # FLOW 1: Landing to Auth
        print("\n=== FLOW 1: Landing to Auth ===")
        flow1 = test_flow_1(page)
        results["flows"].append(flow1)
        results["summary"]["flows_tested"] += 1
        if flow1["status"] == "pass":
            results["summary"]["flows_passed"] += 1
        else:
            results["summary"]["flows_failed"] += 1
        results["summary"]["issues_found"] += len(flow1["issues"])

        # FLOW 2: Auth Page State
        print("\n=== FLOW 2: Auth Page State ===")
        flow2 = test_flow_2(page)
        results["flows"].append(flow2)
        results["summary"]["flows_tested"] += 1
        if flow2["status"] == "pass":
            results["summary"]["flows_passed"] += 1
        else:
            results["summary"]["flows_failed"] += 1
        results["summary"]["issues_found"] += len(flow2["issues"])

        # FLOW 3: Protected Route Redirect
        print("\n=== FLOW 3: Protected Route Redirect ===")
        flow3 = test_flow_3(page)
        results["flows"].append(flow3)
        results["summary"]["flows_tested"] += 1
        if flow3["status"] == "pass":
            results["summary"]["flows_passed"] += 1
        else:
            results["summary"]["flows_failed"] += 1
        results["summary"]["issues_found"] += len(flow3["issues"])

        # FLOW 4: Settings Navigation
        print("\n=== FLOW 4: Settings Navigation ===")
        flow4 = test_flow_4(page)
        results["flows"].append(flow4)
        results["summary"]["flows_tested"] += 1
        if flow4["status"] == "pass":
            results["summary"]["flows_passed"] += 1
        else:
            results["summary"]["flows_failed"] += 1
        results["summary"]["issues_found"] += len(flow4["issues"])

        browser.close()

    return results

def test_flow_1(page):
    """FLOW 1: Landing to Auth"""
    flow = {
        "name": "Landing to Auth",
        "status": "pass",
        "steps": [],
        "issues": []
    }

    try:
        # Step 1: Go to /
        print("Step 1: Navigating to /")
        page.goto(BASE_URL, wait_until="networkidle", timeout=10000)
        time.sleep(1)  # Let JS execute

        final_url = page.url
        print(f"Final URL: {final_url}")

        if "/auth/signin" in final_url:
            flow["steps"].append({
                "action": "goto /",
                "result": f"redirected to {final_url}",
                "status": "pass"
            })
            print("✓ Redirected to signin as expected")
        elif final_url == BASE_URL or final_url == BASE_URL + "/":
            # Check if landing content is shown
            page.screenshot(path="/tmp/flow1_landing.png", full_page=True)
            flow["steps"].append({
                "action": "goto /",
                "result": "shows landing page",
                "status": "pass"
            })
            print("✓ Landing page shown")
        else:
            flow["steps"].append({
                "action": "goto /",
                "result": f"unexpected redirect to {final_url}",
                "status": "fail"
            })
            flow["status"] = "fail"
            flow["issues"].append({
                "type": "unexpected_redirect",
                "severity": "medium",
                "description": f"Expected / or /auth/signin, got {final_url}",
                "step": "goto /",
                "screenshot": None
            })
            print(f"✗ Unexpected redirect to {final_url}")

    except Exception as e:
        flow["status"] = "fail"
        flow["steps"].append({
            "action": "goto /",
            "result": f"error: {str(e)}",
            "status": "fail"
        })
        flow["issues"].append({
            "type": "crash",
            "severity": "critical",
            "description": f"Failed to load root page: {str(e)}",
            "step": "goto /",
            "screenshot": None
        })
        print(f"✗ Error: {e}")

    return flow

def test_flow_2(page):
    """FLOW 2: Auth Page State"""
    flow = {
        "name": "Auth Page State",
        "status": "pass",
        "steps": [],
        "issues": []
    }

    try:
        # Step 1: Go to /auth/signin
        print("Step 1: Navigating to /auth/signin")
        page.goto(f"{BASE_URL}/auth/signin", wait_until="networkidle", timeout=10000)
        time.sleep(1)

        flow["steps"].append({
            "action": "goto /auth/signin",
            "result": "page loaded",
            "status": "pass"
        })
        print("✓ Auth page loaded")

        # Step 2: Check for GitHub sign-in button
        print("Step 2: Looking for GitHub sign-in button")
        page.screenshot(path="/tmp/flow2_auth.png", full_page=True)

        # Try different selectors for GitHub button
        github_button = None
        selectors = [
            "button:has-text('Sign in with GitHub')",
            "button:has-text('GitHub')",
            "a:has-text('Sign in with GitHub')",
            "a:has-text('GitHub')",
            "[data-testid='github-signin']"
        ]

        for selector in selectors:
            try:
                github_button = page.locator(selector).first
                if github_button.is_visible(timeout=1000):
                    print(f"✓ Found GitHub button with selector: {selector}")
                    break
            except:
                continue

        if github_button and github_button.is_visible():
            flow["steps"].append({
                "action": "check for GitHub button",
                "result": "GitHub sign-in button found",
                "status": "pass"
            })
            print("✓ GitHub sign-in button present")
        else:
            flow["steps"].append({
                "action": "check for GitHub button",
                "result": "GitHub sign-in button NOT found",
                "status": "fail"
            })
            flow["status"] = "fail"
            flow["issues"].append({
                "type": "missing_element",
                "severity": "critical",
                "description": "GitHub sign-in button not found on auth page",
                "step": "check for GitHub button",
                "screenshot": "/tmp/flow2_auth.png"
            })
            print("✗ GitHub sign-in button missing")

        # Step 3: Check for console errors
        print("Step 3: Checking for page errors")
        # Errors are logged via page.on listeners

    except Exception as e:
        flow["status"] = "fail"
        flow["steps"].append({
            "action": "test auth page",
            "result": f"error: {str(e)}",
            "status": "fail"
        })
        flow["issues"].append({
            "type": "crash",
            "severity": "critical",
            "description": f"Failed to test auth page: {str(e)}",
            "step": "test auth page",
            "screenshot": None
        })
        print(f"✗ Error: {e}")

    return flow

def test_flow_3(page):
    """FLOW 3: Protected Route Redirect"""
    flow = {
        "name": "Protected Route Redirect",
        "status": "pass",
        "steps": [],
        "issues": []
    }

    try:
        # Step 1: Go to /admin/backlog without auth
        print("Step 1: Navigating to /admin/backlog (protected)")
        page.goto(f"{BASE_URL}/admin/backlog", wait_until="networkidle", timeout=10000)
        time.sleep(1)

        final_url = page.url
        print(f"Final URL: {final_url}")

        # Step 2: Check if redirected or prompted
        if "/auth/signin" in final_url:
            flow["steps"].append({
                "action": "goto /admin/backlog without auth",
                "result": f"redirected to {final_url}",
                "status": "pass"
            })
            print("✓ Properly redirected to signin")
        elif "/admin/backlog" in final_url:
            # Check if auth prompt is shown
            page.screenshot(path="/tmp/flow3_protected.png", full_page=True)

            # Look for auth prompts or setup messages
            auth_indicators = [
                "Sign in",
                "Authentication required",
                "Please sign in",
                "GitHub",
                "Connect"
            ]

            page_text = page.content()
            has_auth_prompt = any(indicator.lower() in page_text.lower() for indicator in auth_indicators)

            if has_auth_prompt:
                flow["steps"].append({
                    "action": "goto /admin/backlog without auth",
                    "result": "page shows auth prompt",
                    "status": "pass"
                })
                print("✓ Auth prompt shown on protected route")
            else:
                flow["steps"].append({
                    "action": "goto /admin/backlog without auth",
                    "result": "no redirect and no auth prompt",
                    "status": "fail"
                })
                flow["status"] = "fail"
                flow["issues"].append({
                    "type": "broken_navigation",
                    "severity": "critical",
                    "description": "Protected route accessible without auth or prompt",
                    "step": "goto /admin/backlog without auth",
                    "screenshot": "/tmp/flow3_protected.png"
                })
                print("✗ No auth protection on protected route")
        else:
            flow["steps"].append({
                "action": "goto /admin/backlog without auth",
                "result": f"unexpected redirect to {final_url}",
                "status": "fail"
            })
            flow["status"] = "fail"
            flow["issues"].append({
                "type": "unexpected_redirect",
                "severity": "high",
                "description": f"Expected /auth/signin or auth prompt, got {final_url}",
                "step": "goto /admin/backlog without auth",
                "screenshot": None
            })
            print(f"✗ Unexpected redirect to {final_url}")

    except Exception as e:
        flow["status"] = "fail"
        flow["steps"].append({
            "action": "test protected route",
            "result": f"error: {str(e)}",
            "status": "fail"
        })
        flow["issues"].append({
            "type": "crash",
            "severity": "critical",
            "description": f"Failed to test protected route: {str(e)}",
            "step": "test protected route",
            "screenshot": None
        })
        print(f"✗ Error: {e}")

    return flow

def test_flow_4(page):
    """FLOW 4: Settings Navigation"""
    flow = {
        "name": "Settings Navigation",
        "status": "pass",
        "steps": [],
        "issues": []
    }

    settings_pages = [
        "/settings/database",
        "/settings/github",
        "/settings/api-keys"
    ]

    for settings_path in settings_pages:
        try:
            print(f"Testing navigation to {settings_path}")
            page.goto(f"{BASE_URL}{settings_path}", wait_until="networkidle", timeout=10000)
            time.sleep(1)

            final_url = page.url
            page.screenshot(path=f"/tmp/flow4_{settings_path.split('/')[-1]}.png", full_page=True)

            # Check if we stayed on the settings page or got redirected
            if settings_path in final_url:
                flow["steps"].append({
                    "action": f"goto {settings_path}",
                    "result": "page loaded successfully",
                    "status": "pass"
                })
                print(f"✓ {settings_path} loaded")
            elif "/auth/signin" in final_url:
                flow["steps"].append({
                    "action": f"goto {settings_path}",
                    "result": "redirected to signin (expected for protected route)",
                    "status": "pass"
                })
                print(f"✓ {settings_path} protected by auth")
            else:
                flow["steps"].append({
                    "action": f"goto {settings_path}",
                    "result": f"unexpected redirect to {final_url}",
                    "status": "fail"
                })
                flow["status"] = "fail"
                flow["issues"].append({
                    "type": "unexpected_redirect",
                    "severity": "medium",
                    "description": f"Expected {settings_path} or /auth/signin, got {final_url}",
                    "step": f"goto {settings_path}",
                    "screenshot": f"/tmp/flow4_{settings_path.split('/')[-1]}.png"
                })
                print(f"✗ Unexpected redirect from {settings_path} to {final_url}")

        except Exception as e:
            flow["status"] = "fail"
            flow["steps"].append({
                "action": f"goto {settings_path}",
                "result": f"error: {str(e)}",
                "status": "fail"
            })
            flow["issues"].append({
                "type": "crash",
                "severity": "high",
                "description": f"Failed to load {settings_path}: {str(e)}",
                "step": f"goto {settings_path}",
                "screenshot": None
            })
            print(f"✗ Error loading {settings_path}: {e}")

    return flow

if __name__ == "__main__":
    print("Starting Mason Dashboard Flow Tests")
    print(f"Base URL: {BASE_URL}\n")

    results = test_flows()

    # Print summary
    print("\n" + "="*60)
    print("FLOW TEST SUMMARY")
    print("="*60)
    print(f"Flows Tested: {results['summary']['flows_tested']}")
    print(f"Flows Passed: {results['summary']['flows_passed']}")
    print(f"Flows Failed: {results['summary']['flows_failed']}")
    print(f"Issues Found: {results['summary']['issues_found']}")
    print("="*60)

    # Save results
    import os
    os.makedirs("/home/jeffl/projects/mason/.claude/battle-test/results", exist_ok=True)

    output_file = "/home/jeffl/projects/mason/.claude/battle-test/results/FLOW-1.json"
    with open(output_file, 'w') as f:
        json.dump(results, f, indent=2)

    print(f"\nResults saved to: {output_file}")

    # Exit with error code if any flows failed
    exit(0 if results['summary']['flows_failed'] == 0 else 1)
