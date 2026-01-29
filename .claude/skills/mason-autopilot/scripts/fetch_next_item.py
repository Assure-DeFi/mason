#!/usr/bin/env python3
"""
Fetch Next Item Script

Fetches the next approved backlog item(s) from the Mason API.
Outputs JSON to stdout for consumption by Claude.

Usage:
    python fetch_next_item.py [--limit N] [--repo ID]

Options:
    --limit N     Number of items to fetch (default: 1, max: 10)
    --repo ID     Filter by repository ID
"""

import json
import sys
from pathlib import Path

# Add lib directory to path
sys.path.insert(0, str(Path(__file__).parent / 'lib'))

from mason_api import MasonApiClient, MasonApiError


def main():
    """Fetch and output next approved items."""
    # Parse arguments
    limit = 1
    repo_id = None

    args = sys.argv[1:]
    i = 0
    while i < len(args):
        if args[i] == '--limit' and i + 1 < len(args):
            try:
                limit = int(args[i + 1])
                limit = max(1, min(10, limit))  # Clamp to 1-10
            except ValueError:
                print(f'Invalid limit: {args[i + 1]}', file=sys.stderr)
                sys.exit(1)
            i += 2
        elif args[i] == '--repo' and i + 1 < len(args):
            repo_id = args[i + 1]
            i += 2
        elif args[i] in ('-h', '--help'):
            print(__doc__)
            sys.exit(0)
        else:
            print(f'Unknown argument: {args[i]}', file=sys.stderr)
            sys.exit(1)

    try:
        # Create API client
        client = MasonApiClient()

        # Fetch items
        result = client.get_next_item(repo_id, limit)

        # Output as JSON
        print(json.dumps(result, indent=2))

        # Exit with appropriate code
        if result.get('items') or result.get('item'):
            sys.exit(0)
        else:
            # No items found, but not an error
            sys.exit(0)

    except MasonApiError as e:
        # Output error as JSON for easier parsing
        error_response = {
            'error': str(e),
            'status_code': e.status_code
        }
        print(json.dumps(error_response, indent=2), file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        error_response = {
            'error': f'Unexpected error: {e}',
            'status_code': None
        }
        print(json.dumps(error_response, indent=2), file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
