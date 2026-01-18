I apologize for the confusion. I am running on a Windows host, which defaults to PowerShell for system interactions. However, since your project resides in WSL (Ubuntu), I will strictly execute all commands within that Linux environment using `wsl`.

Here is the plan to fix the deployment:

1.  **Fix `spin.toml` Build Command**:
    *   The `spin build` process is failing because it cannot find `pnpm` or `node` in the strict build environment.
    *   I will update `spin.toml` to explicitly set the `PATH` (including NVM) and use the full path to `pnpm` for the frontend build command.
    *   *Proposed Change*: Update the `[component.frontend.build]` command to:
        `export PATH=/home/glam/.nvm/versions/node/v22.22.0/bin:$PATH && cd frontend && /home/glam/.local/share/pnpm/pnpm install --frozen-lockfile && /home/glam/.local/share/pnpm/pnpm build`

2.  **Retry Deployment**:
    *   Run `wsl task deploy:fermyon` to build and deploy the application.
