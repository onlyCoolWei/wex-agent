import { DockerSandbox } from "./index.ts";
import { viteReactTemplate } from "./vite-template.ts";

const sandbox = new DockerSandbox({ allowNetwork: true, defaultTimeoutMs: 120_000 });
try {
  const workspace = await sandbox.createWorkspace("vite-mvp");
  for (const [path, content] of Object.entries(viteReactTemplate))
    await sandbox.writeFile(path, content);
  const install = await sandbox.exec({
    command: "npm install --no-fund --no-audit",
    timeoutMs: 120_000,
  });
  if (install.exitCode !== 0) throw new Error(install.stderr);
  const build = await sandbox.exec({ command: "npm run build", timeoutMs: 120_000 });
  if (build.exitCode !== 0) throw new Error(build.stderr);
  console.log(JSON.stringify({ workspace, build: build.stdout.trim() }, null, 2));
} finally {
  await sandbox.dispose();
}
