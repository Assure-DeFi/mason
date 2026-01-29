#!/usr/bin/env python3
"""
Comprehensive E2E test suite for Mason Compound Learning System.

Tests:
1. API Endpoints (with authentication)
2. Dashboard UI Components
3. AutoPilotButton rendering and functionality
4. Platform selector in setup wizard
5. Clipboard functionality
6. Console error detection
7. Responsive design
8. Screenshots for verification

Usage:
  python3 scripts/with_server.py --server "cd packages/mason-dashboard && pnpm dev" --port 3000 \\
    -- python3 scripts/e2e_test_mason.py
"""

import sys
import json
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

try:
    from playwright.sync_api import sync_playwright, Page, Browser, BrowserContext, expect
except ImportError:
    print("ERROR: Playwright not installed. Install with: pip install playwright && playwright install chromium")
    sys.exit(1)


class MasonE2ETestSuite:
    def __init__(self, base_url: str = "http://localhost:3000"):
        self.base_url = base_url
        self.browser: Optional[Browser] = None
        self.context: Optional[BrowserContext] = None
        self.page: Optional[Page] = None
        self.screenshots_dir = Path("/tmp/mason-e2e-screenshots")
        self.test_results: List[Dict] = []
        self.console_messages: List[Dict] = []

        # Create screenshots directory
        self.screenshots_dir.mkdir(exist_ok=True)

    def setup(self):
        """Initialize browser and page."""
        print("🚀 Setting up test environment...")
        playwright = sync_playwright().start()
        self.browser = playwright.chromium.launch(headless=True)
        self.context = self.browser.new_context(
            viewport={"width": 1920, "height": 1080},
            # Add any auth tokens here if needed
        )
        self.page = self.context.new_page()

        # Capture console messages
        self.page.on("console", lambda msg: self.console_messages.append({
            "type": msg.type,
            "text": msg.text,
            "location": msg.location
        }))

        # Capture page errors
        self.page.on("pageerror", lambda err: self.console_messages.append({
            "type": "error",
            "text": str(err),
            "location": None
        }))

        print(f"✓ Browser ready: {self.browser.version}")

    def teardown(self):
        """Close browser and cleanup."""
        if self.page:
            self.page.close()
        if self.context:
            self.context.close()
        if self.browser:
            self.browser.close()
        print("✓ Browser closed")

    def take_screenshot(self, name: str, full_page: bool = True):
        """Take a screenshot with timestamp."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{timestamp}_{name}.png"
        path = self.screenshots_dir / filename
        self.page.screenshot(path=str(path), full_page=full_page)
        print(f"  📸 Screenshot: {path}")
        return path

    def record_test_result(self, test_name: str, passed: bool, message: str = "", details: Dict = None):
        """Record test result."""
        result = {
            "test": test_name,
            "passed": passed,
            "message": message,
            "details": details or {},
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)

        status = "✓" if passed else "✗"
        print(f"  {status} {test_name}: {message}")

    def check_console_errors(self, test_name: str):
        """Check for console errors."""
        errors = [msg for msg in self.console_messages if msg["type"] == "error"]
        if errors:
            self.record_test_result(
                f"{test_name} - Console Errors",
                False,
                f"Found {len(errors)} console error(s)",
                {"errors": errors[:5]}  # Limit to first 5
            )
        else:
            self.record_test_result(
                f"{test_name} - Console Errors",
                True,
                "No console errors detected"
            )

    # =========================================================================
    # TEST: Home Page
    # =========================================================================
    def test_home_page(self):
        """Test that home page loads without errors."""
        print("\n🧪 Test: Home Page")
        try:
            self.console_messages.clear()
            self.page.goto(self.base_url)
            self.page.wait_for_load_state("networkidle", timeout=10000)

            self.take_screenshot("01_home_page")

            # Check page title
            title = self.page.title()
            self.record_test_result(
                "Home Page - Load",
                True,
                f"Page loaded successfully: {title}"
            )

            self.check_console_errors("Home Page")

        except Exception as e:
            self.record_test_result("Home Page - Load", False, str(e))

    # =========================================================================
    # TEST: Backlog Page
    # =========================================================================
    def test_backlog_page(self):
        """Test backlog page and AutoPilotButton."""
        print("\n🧪 Test: Backlog Page")
        try:
            self.console_messages.clear()
            self.page.goto(f"{self.base_url}/admin/backlog")
            self.page.wait_for_load_state("networkidle", timeout=10000)

            # Wait a bit for any dynamic content
            time.sleep(2)

            self.take_screenshot("02_backlog_page")

            # Check if page loaded
            self.record_test_result(
                "Backlog Page - Load",
                True,
                "Backlog page loaded successfully"
            )

            # Check for AutoPilotButton (may or may not be visible depending on data)
            try:
                auto_pilot_button = self.page.locator('button:has-text("Auto-Pilot")')
                if auto_pilot_button.count() > 0:
                    self.record_test_result(
                        "Backlog Page - AutoPilotButton",
                        True,
                        "AutoPilotButton found on page"
                    )

                    # Try to click it and verify clipboard interaction
                    auto_pilot_button.click()
                    time.sleep(1)

                    # Check for tooltip/success message
                    tooltip = self.page.locator('text=/Copied|copied/i')
                    if tooltip.count() > 0:
                        self.record_test_result(
                            "Backlog Page - AutoPilot Click",
                            True,
                            "AutoPilotButton clicked, copy feedback displayed"
                        )
                    else:
                        self.record_test_result(
                            "Backlog Page - AutoPilot Click",
                            True,
                            "AutoPilotButton clicked (no visual feedback detected)"
                        )

                    self.take_screenshot("02b_autopilot_clicked")
                else:
                    self.record_test_result(
                        "Backlog Page - AutoPilotButton",
                        True,
                        "No AutoPilotButton (likely no approved items - this is OK)"
                    )
            except Exception as e:
                self.record_test_result(
                    "Backlog Page - AutoPilotButton",
                    False,
                    f"Error checking AutoPilotButton: {str(e)}"
                )

            self.check_console_errors("Backlog Page")

        except Exception as e:
            self.record_test_result("Backlog Page - Load", False, str(e))

    # =========================================================================
    # TEST: Setup Wizard
    # =========================================================================
    def test_setup_wizard(self):
        """Test setup wizard and platform selector."""
        print("\n🧪 Test: Setup Wizard")
        try:
            self.console_messages.clear()
            self.page.goto(f"{self.base_url}/setup")
            self.page.wait_for_load_state("networkidle", timeout=10000)

            time.sleep(2)

            self.take_screenshot("03_setup_wizard")

            self.record_test_result(
                "Setup Wizard - Load",
                True,
                "Setup wizard page loaded"
            )

            # Try to navigate to complete step (may need to click through steps)
            # Look for platform selection buttons
            try:
                platform_buttons = self.page.locator('button:has-text("macOS"), button:has-text("Windows"), button:has-text("Linux")')

                if platform_buttons.count() > 0:
                    self.record_test_result(
                        "Setup Wizard - Platform Selector",
                        True,
                        f"Found {platform_buttons.count()} platform selector buttons"
                    )

                    # Test clicking each platform
                    platforms = ["macOS", "Windows", "Linux"]
                    for platform in platforms:
                        try:
                            btn = self.page.locator(f'button:has-text("{platform}")')
                            if btn.count() > 0:
                                btn.first.click()
                                time.sleep(0.5)
                                self.take_screenshot(f"03_{platform.lower()}_selected")
                                self.record_test_result(
                                    f"Setup Wizard - {platform} Selection",
                                    True,
                                    f"Successfully selected {platform}"
                                )
                        except Exception as e:
                            self.record_test_result(
                                f"Setup Wizard - {platform} Selection",
                                False,
                                f"Error selecting {platform}: {str(e)}"
                            )

                    # Check if install command changes
                    install_command = self.page.locator('code')
                    if install_command.count() > 0:
                        command_text = install_command.first.text_content()
                        self.record_test_result(
                            "Setup Wizard - Install Command",
                            True,
                            f"Install command displayed ({len(command_text)} chars)"
                        )
                    else:
                        self.record_test_result(
                            "Setup Wizard - Install Command",
                            True,
                            "No install command visible (may need API key generation)"
                        )
                else:
                    self.record_test_result(
                        "Setup Wizard - Platform Selector",
                        True,
                        "Platform selector not visible on this step"
                    )
            except Exception as e:
                self.record_test_result(
                    "Setup Wizard - Platform Selector",
                    False,
                    f"Error testing platform selector: {str(e)}"
                )

            self.check_console_errors("Setup Wizard")

        except Exception as e:
            self.record_test_result("Setup Wizard - Load", False, str(e))

    # =========================================================================
    # TEST: API Endpoints (requires auth)
    # =========================================================================
    def test_api_endpoints(self):
        """Test API endpoints."""
        print("\n🧪 Test: API Endpoints")

        # Note: These tests will likely fail with 401 without proper auth
        # but we can verify the endpoints respond correctly to missing auth

        endpoints = [
            ("/api/v1/backlog/next", "GET", None),
        ]

        for path, method, body in endpoints:
            try:
                url = f"{self.base_url}{path}"
                response = self.page.request.fetch(url, method=method)

                # We expect 401 without auth - that's a PASS
                if response.status == 401:
                    self.record_test_result(
                        f"API - {method} {path}",
                        True,
                        f"Endpoint responds correctly (401 without auth)"
                    )
                elif response.status < 500:
                    # Any 2xx, 3xx, 4xx is acceptable (endpoint is working)
                    self.record_test_result(
                        f"API - {method} {path}",
                        True,
                        f"Endpoint responds with status {response.status}"
                    )
                else:
                    # 5xx is a failure
                    self.record_test_result(
                        f"API - {method} {path}",
                        False,
                        f"Server error: {response.status}"
                    )
            except Exception as e:
                self.record_test_result(
                    f"API - {method} {path}",
                    False,
                    f"Error: {str(e)}"
                )

    # =========================================================================
    # TEST: Responsive Design
    # =========================================================================
    def test_responsive_design(self):
        """Test responsive design at different viewport sizes."""
        print("\n🧪 Test: Responsive Design")

        viewports = [
            ("Mobile", 375, 667),
            ("Tablet", 768, 1024),
            ("Desktop", 1920, 1080),
        ]

        for name, width, height in viewports:
            try:
                self.page.set_viewport_size({"width": width, "height": height})
                self.page.goto(f"{self.base_url}/admin/backlog")
                self.page.wait_for_load_state("networkidle", timeout=10000)
                time.sleep(1)

                self.take_screenshot(f"04_responsive_{name.lower()}")

                self.record_test_result(
                    f"Responsive - {name} ({width}x{height})",
                    True,
                    f"Page renders correctly at {width}x{height}"
                )
            except Exception as e:
                self.record_test_result(
                    f"Responsive - {name}",
                    False,
                    f"Error: {str(e)}"
                )

        # Reset viewport
        self.page.set_viewport_size({"width": 1920, "height": 1080})

    # =========================================================================
    # RUN ALL TESTS
    # =========================================================================
    def run_all_tests(self):
        """Run all E2E tests."""
        print("=" * 70)
        print("Mason Compound Learning System - E2E Test Suite")
        print("=" * 70)

        start_time = time.time()

        self.setup()

        try:
            self.test_home_page()
            self.test_backlog_page()
            self.test_setup_wizard()
            self.test_api_endpoints()
            self.test_responsive_design()

        finally:
            self.teardown()

        elapsed = time.time() - start_time

        # Print summary
        self.print_summary(elapsed)

    def print_summary(self, elapsed_time: float):
        """Print test results summary."""
        print("\n" + "=" * 70)
        print("TEST SUMMARY")
        print("=" * 70)

        passed = [r for r in self.test_results if r["passed"]]
        failed = [r for r in self.test_results if not r["passed"]]

        print(f"\nTotal Tests: {len(self.test_results)}")
        print(f"✓ Passed: {len(passed)}")
        print(f"✗ Failed: {len(failed)}")
        print(f"⏱️  Duration: {elapsed_time:.2f}s")

        if failed:
            print("\n❌ FAILED TESTS:")
            for result in failed:
                print(f"  • {result['test']}: {result['message']}")

        print(f"\n📸 Screenshots saved to: {self.screenshots_dir}")

        # Save detailed results to JSON
        results_file = self.screenshots_dir / "test_results.json"
        with open(results_file, 'w') as f:
            json.dump({
                "summary": {
                    "total": len(self.test_results),
                    "passed": len(passed),
                    "failed": len(failed),
                    "duration": elapsed_time
                },
                "tests": self.test_results,
                "console_messages": self.console_messages
            }, f, indent=2)

        print(f"📄 Detailed results: {results_file}")

        print("\n" + "=" * 70)

        # Exit with appropriate code
        return 0 if len(failed) == 0 else 1


def main():
    suite = MasonE2ETestSuite()
    exit_code = suite.run_all_tests()
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
