#!/usr/bin/env python3
"""
Mason API Client

Provides methods to interact with the Mason backlog API:
- get_next_item(): Fetch highest-priority approved item
- start_item(): Mark item as in_progress
- complete_item(): Mark item as completed with PR URL
- fail_item(): Mark item as failed with error message
"""

import json
import sys
import time
from pathlib import Path
from typing import Optional
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError


class MasonApiError(Exception):
    """Custom exception for Mason API errors."""
    def __init__(self, message: str, status_code: Optional[int] = None):
        super().__init__(message)
        self.status_code = status_code


class MasonApiClient:
    """Client for interacting with the Mason API."""

    MAX_RETRIES = 3
    RETRY_DELAY = 1.0  # seconds
    TIMEOUT = 30  # seconds

    def __init__(self, config_path: Optional[Path] = None):
        """
        Initialize the API client.

        Args:
            config_path: Path to mason.config.json. If None, searches for it.
        """
        self.config = self._load_config(config_path)
        self.api_key = self.config.get('apiKey')
        self.dashboard_url = self.config.get('dashboardUrl', 'https://mason.assuredefi.com')

        if not self.api_key:
            raise MasonApiError('Missing apiKey in mason.config.json')

    def _load_config(self, config_path: Optional[Path] = None) -> dict:
        """Load mason.config.json from project root or specified path."""
        if config_path:
            path = config_path
        else:
            # Search upward for mason.config.json
            current = Path.cwd()
            while current != current.parent:
                candidate = current / 'mason.config.json'
                if candidate.exists():
                    path = candidate
                    break
                current = current.parent
            else:
                raise MasonApiError('Could not find mason.config.json')

        try:
            with open(path, 'r') as f:
                return json.load(f)
        except json.JSONDecodeError as e:
            raise MasonApiError(f'Invalid JSON in mason.config.json: {e}')
        except FileNotFoundError:
            raise MasonApiError(f'Config file not found: {path}')

    def _make_request(
        self,
        method: str,
        endpoint: str,
        data: Optional[dict] = None,
        retry_count: int = 0
    ) -> dict:
        """
        Make an HTTP request to the Mason API.

        Args:
            method: HTTP method (GET, POST)
            endpoint: API endpoint path (e.g., '/api/v1/backlog/next')
            data: Request body for POST requests
            retry_count: Current retry attempt

        Returns:
            Parsed JSON response
        """
        url = f'{self.dashboard_url}{endpoint}'

        headers = {
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        }

        body = json.dumps(data).encode('utf-8') if data else None

        req = Request(url, data=body, headers=headers, method=method)

        try:
            with urlopen(req, timeout=self.TIMEOUT) as response:
                response_data = response.read().decode('utf-8')
                return json.loads(response_data) if response_data else {}

        except HTTPError as e:
            error_body = e.read().decode('utf-8') if e.fp else ''
            try:
                error_json = json.loads(error_body)
                error_msg = error_json.get('error', str(e))
            except json.JSONDecodeError:
                error_msg = error_body or str(e)

            # Don't retry client errors (4xx)
            if 400 <= e.code < 500:
                raise MasonApiError(error_msg, e.code)

            # Retry server errors (5xx)
            if retry_count < self.MAX_RETRIES:
                time.sleep(self.RETRY_DELAY * (retry_count + 1))
                return self._make_request(method, endpoint, data, retry_count + 1)

            raise MasonApiError(f'Server error after {self.MAX_RETRIES} retries: {error_msg}', e.code)

        except URLError as e:
            if retry_count < self.MAX_RETRIES:
                time.sleep(self.RETRY_DELAY * (retry_count + 1))
                return self._make_request(method, endpoint, data, retry_count + 1)
            raise MasonApiError(f'Network error after {self.MAX_RETRIES} retries: {e.reason}')

    def get_next_item(self, repository_id: Optional[str] = None, limit: int = 1) -> dict:
        """
        Fetch the next approved item(s) to execute.

        Args:
            repository_id: Optional filter by repository
            limit: Number of items to fetch (default: 1)

        Returns:
            API response with item(s)
        """
        endpoint = f'/api/v1/backlog/next?limit={limit}'
        if repository_id:
            endpoint += f'&repository_id={repository_id}'

        return self._make_request('GET', endpoint)

    def start_item(self, item_id: str, branch_name: str) -> dict:
        """
        Mark an item as in_progress.

        Args:
            item_id: The backlog item ID
            branch_name: The git branch name for this work

        Returns:
            API response with updated item
        """
        return self._make_request(
            'POST',
            f'/api/v1/backlog/{item_id}/start',
            {'branch_name': branch_name}
        )

    def complete_item(self, item_id: str, pr_url: str) -> dict:
        """
        Mark an item as completed.

        Args:
            item_id: The backlog item ID
            pr_url: The URL of the created PR

        Returns:
            API response with updated item
        """
        return self._make_request(
            'POST',
            f'/api/v1/backlog/{item_id}/complete',
            {'pr_url': pr_url}
        )

    def fail_item(self, item_id: str, error_message: Optional[str] = None) -> dict:
        """
        Mark an item as failed.

        Args:
            item_id: The backlog item ID
            error_message: Optional description of what went wrong

        Returns:
            API response with updated item
        """
        data = {'error_message': error_message} if error_message else {}
        return self._make_request(
            'POST',
            f'/api/v1/backlog/{item_id}/fail',
            data
        )


def main():
    """CLI interface for the Mason API client."""
    if len(sys.argv) < 2:
        print('Usage: mason_api.py <command> [args]')
        print('Commands:')
        print('  next [--limit N] [--repo ID]  Get next approved item(s)')
        print('  start <item_id> <branch>      Mark item as in_progress')
        print('  complete <item_id> <pr_url>   Mark item as completed')
        print('  fail <item_id> [message]      Mark item as failed')
        sys.exit(1)

    try:
        client = MasonApiClient()
        command = sys.argv[1]

        if command == 'next':
            limit = 1
            repo_id = None
            i = 2
            while i < len(sys.argv):
                if sys.argv[i] == '--limit' and i + 1 < len(sys.argv):
                    limit = int(sys.argv[i + 1])
                    i += 2
                elif sys.argv[i] == '--repo' and i + 1 < len(sys.argv):
                    repo_id = sys.argv[i + 1]
                    i += 2
                else:
                    i += 1

            result = client.get_next_item(repo_id, limit)
            print(json.dumps(result, indent=2))

        elif command == 'start':
            if len(sys.argv) < 4:
                print('Usage: mason_api.py start <item_id> <branch_name>')
                sys.exit(1)
            result = client.start_item(sys.argv[2], sys.argv[3])
            print(json.dumps(result, indent=2))

        elif command == 'complete':
            if len(sys.argv) < 4:
                print('Usage: mason_api.py complete <item_id> <pr_url>')
                sys.exit(1)
            result = client.complete_item(sys.argv[2], sys.argv[3])
            print(json.dumps(result, indent=2))

        elif command == 'fail':
            if len(sys.argv) < 3:
                print('Usage: mason_api.py fail <item_id> [error_message]')
                sys.exit(1)
            error_msg = sys.argv[3] if len(sys.argv) > 3 else None
            result = client.fail_item(sys.argv[2], error_msg)
            print(json.dumps(result, indent=2))

        else:
            print(f'Unknown command: {command}')
            sys.exit(1)

    except MasonApiError as e:
        print(f'Error: {e}', file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
