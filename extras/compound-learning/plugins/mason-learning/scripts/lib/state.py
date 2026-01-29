#!/usr/bin/env python3
"""
Session State Management

Manages session state for pattern learning:
- Tracks tool usage within a session
- Detects retry patterns (failure followed by success)
- Persists state between hook invocations
"""

import json
import os
from dataclasses import dataclass, field, asdict
from datetime import datetime
from pathlib import Path
from typing import Optional


@dataclass
class ToolResult:
    """Represents the result of a tool invocation."""
    tool: str
    command: str
    success: bool
    error: Optional[str]
    goal_hash: str
    timestamp: str


@dataclass
class LearningOpportunity:
    """Represents a detected learning opportunity (retry pattern)."""
    goal_hash: str
    failures: int
    success_command: str
    error_messages: list[str]
    confidence: float


@dataclass
class SessionState:
    """State for a single Claude session."""
    session_id: str
    started_at: str
    tool_history: list[ToolResult] = field(default_factory=list)
    learning_opportunities: list[LearningOpportunity] = field(default_factory=list)

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        return {
            'session_id': self.session_id,
            'started_at': self.started_at,
            'tool_history': [asdict(t) for t in self.tool_history],
            'learning_opportunities': [asdict(l) for l in self.learning_opportunities]
        }

    @classmethod
    def from_dict(cls, data: dict) -> 'SessionState':
        """Create from dictionary."""
        state = cls(
            session_id=data['session_id'],
            started_at=data['started_at']
        )
        state.tool_history = [
            ToolResult(**t) for t in data.get('tool_history', [])
        ]
        state.learning_opportunities = [
            LearningOpportunity(**l) for l in data.get('learning_opportunities', [])
        ]
        return state


def get_state_dir() -> Path:
    """Get the directory for storing state files."""
    # Use platform-appropriate location
    if os.name == 'nt':  # Windows
        base = Path(os.environ.get('USERPROFILE', '~'))
    else:  # macOS/Linux
        base = Path.home()

    state_dir = base / '.mason' / 'learning'
    state_dir.mkdir(parents=True, exist_ok=True)
    return state_dir


def get_state_file(session_id: str) -> Path:
    """Get the state file path for a session."""
    return get_state_dir() / f'state_{session_id}.json'


def get_session_id() -> str:
    """
    Get the current session ID from environment.

    Claude Code sets CLAUDE_SESSION_ID for each session.
    Falls back to a timestamp-based ID if not available.
    """
    session_id = os.environ.get('CLAUDE_SESSION_ID')
    if not session_id:
        # Fall back to timestamp-based ID
        session_id = datetime.now().strftime('%Y%m%d_%H%M%S')
    return session_id


def load_state(session_id: Optional[str] = None) -> SessionState:
    """
    Load session state from file.

    Args:
        session_id: Session ID (uses current session if None)

    Returns:
        SessionState object (new or loaded from file)
    """
    if session_id is None:
        session_id = get_session_id()

    state_file = get_state_file(session_id)

    if state_file.exists():
        try:
            with open(state_file, 'r') as f:
                data = json.load(f)
                return SessionState.from_dict(data)
        except (json.JSONDecodeError, KeyError):
            # Corrupted file, start fresh
            pass

    # Create new state
    return SessionState(
        session_id=session_id,
        started_at=datetime.now().isoformat()
    )


def save_state(state: SessionState) -> None:
    """
    Save session state to file.

    Args:
        state: SessionState to save
    """
    state_file = get_state_file(state.session_id)

    with open(state_file, 'w') as f:
        json.dump(state.to_dict(), f, indent=2)


def delete_state(session_id: str) -> None:
    """
    Delete a session state file.

    Args:
        session_id: Session ID to delete
    """
    state_file = get_state_file(session_id)
    if state_file.exists():
        state_file.unlink()


def list_sessions() -> list[str]:
    """List all session IDs with state files."""
    state_dir = get_state_dir()
    sessions = []

    for f in state_dir.glob('state_*.json'):
        session_id = f.stem.replace('state_', '')
        sessions.append(session_id)

    return sessions


def cleanup_old_sessions(max_age_hours: int = 24) -> int:
    """
    Clean up state files older than max_age_hours.

    Returns:
        Number of files cleaned up
    """
    state_dir = get_state_dir()
    now = datetime.now()
    cleaned = 0

    for f in state_dir.glob('state_*.json'):
        try:
            # Check file modification time
            mtime = datetime.fromtimestamp(f.stat().st_mtime)
            age_hours = (now - mtime).total_seconds() / 3600

            if age_hours > max_age_hours:
                f.unlink()
                cleaned += 1
        except OSError:
            pass

    return cleaned
