# Smart Full-Stack Coding Agent

An interactive app for orchestrating AI-powered software development.

## Features

- **4-Step Task Wizard** — Describe your feature, pick your stack, set repo/env, and configure options
- **AI Code Generation** — Uses the AI service to generate production-ready code from your spec
- **AI Code Review** — Automatically reviews generated code for quality, security, and best practices
- **Inline Code Editor** — Edit any generated file before deployment
- **Sandbox Execution** — Emit runs to the chat for live sandbox execution
- **GitHub Deployment** — Push approved code directly to your repository
- **Persistent Run History** — All agent runs are saved and viewable

## Data Contract

### Inputs (CodingTask)
- `task_description`: What to build
- `target_stack`: Technology stack
- `repository_url`: Destination Git repo
- `execution_environment`: Sandbox environment definition
- `config`: Optional style, security, test preferences

### Outputs (AgentRun)
- `generated_code`: Array of file objects with path and content
- `review_report`: Quality score, security issues, suggestions, pass/fail
- `execution_results`: Sandbox success flag, logs, errors
- `summary`: Human-readable status and next steps
- `deployment_info`: Commit SHA and URL when deployed

## Architecture

- `types.ts` — Shared TypeScript interfaces
- `App.tsx` — Main orchestrator with state management and AI service calls
- `components/TaskInput.tsx` — Multi-step form for task capture
- `components/RunHistory.tsx` — List of all runs with status badges
- `components/RunDashboard.tsx` — Detail view with tabs for code, review, execution, summary

## Events

The app emits these events to the chat:
- `coding_agent_run_created` — When a new run is created
- `run_in_sandbox` — When user clicks "Run in Sandbox"
- `deploy_to_github` — When user clicks "Push to GitHub"
