#!/usr/bin/env python3
"""
Server lifecycle management helper for E2E testing.
Starts one or more servers, waits for them to be ready, runs a command, then cleans up.

Usage:
  python3 scripts/with_server.py --server "npm run dev" --port 3000 -- python3 test.py
  python3 scripts/with_server.py --server "cd backend && npm start" --port 3000 \\
                                   --server "cd frontend && npm run dev" --port 5173 \\
                                   -- python3 test.py

Arguments:
  --server CMD: Command to start a server (can be specified multiple times)
  --port PORT: Port to check for readiness (can be specified multiple times, matches order of --server)
  --timeout SECS: Timeout in seconds to wait for servers (default: 60)
  --: Separator before the command to run (required)
  CMD: Command to run after servers are ready
"""

import argparse
import subprocess
import sys
import time
import socket
import signal
import os
from typing import List, Tuple

class ServerManager:
    def __init__(self, servers: List[Tuple[str, int]], timeout: int = 60):
        self.servers = servers  # List of (command, port) tuples
        self.timeout = timeout
        self.processes: List[subprocess.Popen] = []

    def is_port_open(self, port: int) -> bool:
        """Check if a port is accepting connections."""
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(1)
        try:
            result = sock.connect_ex(('localhost', port))
            return result == 0
        except:
            return False
        finally:
            sock.close()

    def wait_for_port(self, port: int) -> bool:
        """Wait for a port to become available."""
        start_time = time.time()
        print(f"Waiting for port {port} to be ready...", flush=True)

        while time.time() - start_time < self.timeout:
            if self.is_port_open(port):
                print(f"✓ Port {port} is ready", flush=True)
                return True
            time.sleep(0.5)

        return False

    def start_servers(self) -> bool:
        """Start all servers and wait for them to be ready."""
        for i, (cmd, port) in enumerate(self.servers, 1):
            print(f"Starting server {i}/{len(self.servers)}: {cmd}", flush=True)

            # Start the server process
            process = subprocess.Popen(
                cmd,
                shell=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                preexec_fn=os.setsid if sys.platform != 'win32' else None
            )
            self.processes.append(process)

            # Wait for the port to be ready
            if not self.wait_for_port(port):
                print(f"✗ Server on port {port} failed to start within {self.timeout}s", flush=True)
                self.cleanup()
                return False

            # Give it a moment to stabilize
            time.sleep(1)

        print(f"✓ All {len(self.servers)} server(s) ready", flush=True)
        return True

    def cleanup(self):
        """Stop all running servers."""
        print(f"\nStopping {len(self.processes)} server(s)...", flush=True)

        for i, process in enumerate(self.processes, 1):
            if process.poll() is None:  # Still running
                try:
                    if sys.platform == 'win32':
                        process.terminate()
                    else:
                        # Kill the entire process group
                        os.killpg(os.getpgid(process.pid), signal.SIGTERM)

                    # Wait briefly for graceful shutdown
                    try:
                        process.wait(timeout=5)
                    except subprocess.TimeoutExpired:
                        # Force kill if necessary
                        if sys.platform == 'win32':
                            process.kill()
                        else:
                            os.killpg(os.getpgid(process.pid), signal.SIGKILL)
                        process.wait()

                    print(f"✓ Stopped server {i}", flush=True)
                except Exception as e:
                    print(f"✗ Error stopping server {i}: {e}", flush=True)

        self.processes.clear()

def parse_args():
    parser = argparse.ArgumentParser(
        description='Manage server lifecycle for E2E testing',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )

    parser.add_argument(
        '--server',
        action='append',
        required=True,
        metavar='CMD',
        help='Command to start a server (can be specified multiple times)'
    )

    parser.add_argument(
        '--port',
        action='append',
        type=int,
        required=True,
        metavar='PORT',
        help='Port to check for readiness (must match --server order)'
    )

    parser.add_argument(
        '--timeout',
        type=int,
        default=60,
        metavar='SECS',
        help='Timeout in seconds to wait for servers (default: 60)'
    )

    # Everything after '--' is the command to run
    args, command = parser.parse_known_args()

    # Validate
    if not command:
        parser.error("No command specified after '--'")

    if len(args.server) != len(args.port):
        parser.error(f"Number of --server ({len(args.server)}) must match number of --port ({len(args.port)})")

    return args, command

def main():
    args, command = parse_args()

    # Create server manager
    servers = list(zip(args.server, args.port))
    manager = ServerManager(servers, args.timeout)

    try:
        # Start servers
        if not manager.start_servers():
            return 1

        # Run the command
        print(f"\nRunning: {' '.join(command)}", flush=True)
        print("-" * 60, flush=True)

        result = subprocess.run(command)

        print("-" * 60, flush=True)
        print(f"Command exited with code: {result.returncode}", flush=True)

        return result.returncode

    except KeyboardInterrupt:
        print("\n✗ Interrupted by user", flush=True)
        return 130

    except Exception as e:
        print(f"\n✗ Error: {e}", flush=True)
        return 1

    finally:
        manager.cleanup()

if __name__ == '__main__':
    sys.exit(main())
