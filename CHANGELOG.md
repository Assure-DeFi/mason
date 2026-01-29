# Changelog

All notable changes to Mason will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Auto-populate PM domain knowledge on first run
- Auto-generate PRDs for all items during PM review
- Cross-platform install commands (bash and PowerShell)

### Fixed

- Clarified delete account warning about repository connections
- Improved setup wizard install command display

## [0.1.0] - 2024-01-01

### Added

- Initial release of Mason
- Dashboard for managing backlog items across repositories
- PM review command (`/pm-review`) for codebase analysis
- Execute approved command (`/execute-approved`) for implementing improvements
- GitHub OAuth integration for repository access
- Supabase integration for data storage
- Remote execution with automatic PR creation
- Real-time execution progress monitoring
- Repository connection management
- Filtering by improvement type, priority, and complexity
- Brand assets and design system
- E2E test suite with Playwright
- Comprehensive documentation

### Security

- Privacy-first architecture (data stays in user's Supabase)
- Row Level Security (RLS) policies on all tables
- Secure credential handling via environment variables
- GitHub token encryption at rest

[Unreleased]: https://github.com/Assure-DeFi/mason/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/Assure-DeFi/mason/releases/tag/v0.1.0
