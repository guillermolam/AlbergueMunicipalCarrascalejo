# Taskfiles

This directory contains task definitions for the project task runner (go-task).

## How it works

- The root `Taskfile.yml` includes these taskfiles.
- Scripts referenced by tasks live under `scripts/`.

## Taskfiles in this repo

- `Taskfile.main.yml`
- `Taskfile.dev.yml`
- `Taskfile.build.yml`
- `Taskfile.test.yml`
- `Taskfile.quality.yml`
- `Taskfile.clean.yml`
- `Taskfile.setup.yml`
- `Taskfile.deploy.yml`
- `Taskfile.connectivity.yml`
- `Taskfile.turso.yml`
- `Taskfile.spin.yml`
- `Taskfile.ports.yml`
- `Taskfile.arch.yml`
- `Taskfile.act.yml`

## Usage

List tasks:

```bash
task -l
```

Run a task:

```bash
task dev
```