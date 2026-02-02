#!/usr/bin/env python3
"""
UI Testing Script for Mason Dashboard
Tests each page for rendering, console errors, and basic functionality.
"""

from playwright.sync_api import sync_playwright
import json
import time
from datetime import datetime

BASE_URL = "http://localhost:3000"

PAGES = [
    {"path": "/", "name": "landing"},
    {"path": "/auth/signin", "name": "signin"},
    {"path": "/setup", "name": "setup"},
    {"path": "/admin/backlog", "name": "backlog"},
    {"path": "/settings/database", "name": "database-settings"},
    {"path": "/settings/github", "name": "github-settings"},
    {"path": "/settings/api-keys", "name": "api-keys"},
]

def test_page(page, page_info):
    """Test a single page and return results."""
    url = BASE_URL + page_info["path"]
    name = page_info["name"]

    result = {
        "url": page_info["path"],
        "status": "pass",
        "load_time_ms": 0,
        "console_errors": [],
        "issues": []
    }

    # Collect console errors
    console_errors = []
    def handle_console(msg):
        if msg.type == "error":
            console_errors.append(msg.text)

    page.on("console", handle_console)

    try:
        # Navigate and measure load time
        start_time = time.time()
        page.goto(url, timeout=15000)
        page.wait_for_load_state('networkidle', timeout=15000)
        load_time = int((time.time() - start_time) * 1000)
        result["load_time_ms"] = load_time

        # Check if page has content
        body_text = page.locator('body').text_content()

        if not body_text or len(body_text.strip()) < 10:
            result["status"] = "fail"
            result["issues"].append({
                "type": "blank_page",
                "severity": "critical",
                "description": "Page appears to be blank or has minimal content",
                "screenshot": f".claude/battle-test/screenshots/UI-{name}-blank.png"
            })
            page.screenshot(path=f".claude/battle-test/screenshots/UI-{name}-blank.png", full_page=True)

        # Check for error text on page
        error_patterns = ["Error", "Something went wrong", "Unexpected", "Failed to", "Cannot"]
        for pattern in error_patterns:
            try:
                error_elem = page.locator(f"text=/{pattern}/i").first
                if error_elem.is_visible(timeout=1000):
                    error_text = error_elem.text_content()
                    result["status"] = "fail"
                    result["issues"].append({
                        "type": "render_fail",
                        "severity": "high",
                        "description": f"Error text found on page: {error_text}",
                        "screenshot": f".claude/battle-test/screenshots/UI-{name}-error.png"
                    })
                    page.screenshot(path=f".claude/battle-test/screenshots/UI-{name}-error.png", full_page=True)
                    break
            except:
                pass  # Pattern not found, continue

        # Check console errors
        if console_errors:
            result["console_errors"] = console_errors
            # Filter out noise and determine if critical
            critical_errors = [e for e in console_errors if not any(noise in e.lower() for noise in ["favicon", "net::err_failed"])]

            if critical_errors:
                result["status"] = "fail"
                result["issues"].append({
                    "type": "console_error",
                    "severity": "medium",
                    "description": f"Console errors detected: {len(critical_errors)} errors",
                    "screenshot": f".claude/battle-test/screenshots/UI-{name}-console.png"
                })
                page.screenshot(path=f".claude/battle-test/screenshots/UI-{name}-console.png", full_page=True)

    except Exception as e:
        result["status"] = "fail"
        result["issues"].append({
            "type": "timeout",
            "severity": "critical",
            "description": f"Failed to load page: {str(e)}",
            "screenshot": f".claude/battle-test/screenshots/UI-{name}-timeout.png"
        })
        try:
            page.screenshot(path=f".claude/battle-test/screenshots/UI-{name}-timeout.png", full_page=True)
        except:
            pass

    return result

def main():
    """Run all UI tests and generate report."""
    results = {
        "agent_id": "UI-1",
        "completed_at": datetime.utcnow().isoformat() + "Z",
        "summary": {
            "pages_tested": 0,
            "pages_passed": 0,
            "pages_failed": 0,
            "issues_found": 0
        },
        "pages": []
    }

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        for page_info in PAGES:
            print(f"Testing {page_info['path']}...")
            result = test_page(page, page_info)
            results["pages"].append(result)

            results["summary"]["pages_tested"] += 1
            if result["status"] == "pass":
                results["summary"]["pages_passed"] += 1
                print(f"  ✓ PASS ({result['load_time_ms']}ms)")
            else:
                results["summary"]["pages_failed"] += 1
                results["summary"]["issues_found"] += len(result["issues"])
                print(f"  ✗ FAIL - {len(result['issues'])} issue(s)")
                for issue in result["issues"]:
                    print(f"    - {issue['type']}: {issue['description']}")

        browser.close()

    # Write results
    output_path = ".claude/battle-test/results/UI-1.json"
    with open(output_path, 'w') as f:
        json.dump(results, f, indent=2)

    print(f"\n{'='*60}")
    print(f"UI Testing Complete")
    print(f"{'='*60}")
    print(f"Pages Tested: {results['summary']['pages_tested']}")
    print(f"Pages Passed: {results['summary']['pages_passed']}")
    print(f"Pages Failed: {results['summary']['pages_failed']}")
    print(f"Issues Found: {results['summary']['issues_found']}")
    print(f"\nResults written to: {output_path}")

if __name__ == "__main__":
    main()
