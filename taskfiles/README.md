# Taskfiles Documentation

This directory contains task definitions for the project's task runner. These tasks are organized into separate files by category for better maintainability.

## Available Taskfiles

### Core Taskfiles

- `Taskfile.yml` - Main taskfile that includes all other taskfiles
- `Taskfile.dev.yml` - Development tasks (build, run, test, etc.)
- `Taskfile.build.yml` - Build-related tasks
- `Taskfile.test.yml` - Testing tasks
- `Taskfile.quality.yml` - Code quality checks (linting, formatting)
- `Taskfile.clean.yml` - Cleanup tasks
- `Taskfile.setup.yml` - Project setup and initialization
- `Taskfile.act.yml` - Local GitHub Actions testing
- `Taskfile.ports.yml` - Port management for services

### New Taskfiles

- `Taskfile.deploy.yml` - Deployment and infrastructure tasks
- `Taskfile.arch.yml` - Architecture validation and analysis tasks

## Task Categories

### Deployment (`deploy:*`)

- `deploy:production` - Deploy to production environment
- `deploy:staging` - Deploy to staging environment
- `deploy:infra:plan` - Show infrastructure changes
- `deploy:infra:apply` - Apply infrastructure changes
- `deploy:db:migrate` - Run database migrations
- `deploy:db:rollback` - Rollback last migration
- `deploy:health:check` - Check deployment health
- `deploy:rollback` - Rollback to previous deployment
- `deploy:verify` - Verify deployment

### Architecture (`arch:*`)

- `arch:validate` - Validate architecture and dependencies
- `arch:deps:analyze` - Analyze project dependencies
- `arch:deps:circular` - Check for circular dependencies
- `arch:diagram:generate` - Generate architecture diagrams
- `arch:metrics` - Calculate code metrics
- `arch:api:validate` - Validate API contracts

## Usage Examples

List all available tasks:

```bash
task --list-all
```

Run a specific task:

```bash
task deploy:production
```

Run multiple tasks:

```bash
task build test:unit test:integration
```

## Adding New Tasks

1. Identify the appropriate taskfile based on the category of your task
2. Add your task definition to the relevant file
3. Document the task in this README
4. Test the task using `task your:task:name`

## Best Practices

- Keep tasks focused on a single responsibility
- Document each task with a clear description
- Use consistent naming conventions (e.g., `service:action:target`)
- Place complex logic in separate scripts under `scripts/`
- Test tasks in isolation before committing
