// 🤖 Keep manual previews separate from the only automatic production path.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

export function previewBranch(value) {
  if (typeof value !== 'string' || value.trim() !== value
      || !/^preview-[a-z0-9][a-z0-9-]{0,47}$/.test(value)) {
    throw new Error('Manual deploy requires a preview- branch with lowercase letters, digits, or hyphens');
  }
  return value;
}

export function deploymentBranch({ eventName, event, repository, preview }) {
  if (eventName === 'workflow_dispatch') return previewBranch(preview);
  const run = event.workflow_run;
  if (eventName !== 'workflow_run' || run?.conclusion !== 'success'
      || run.event !== 'push' || run.head_branch !== 'main'
      || run.head_repository?.full_name !== repository) {
    throw new Error('Production requires a successful push-to-main runtime gate from this repository');
  }
  return 'main';
}

export function assertDeploymentFreshness({ branch, headSha, mainSha }) {
  if (branch !== 'main') {
    previewBranch(branch);
    return;
  }
  if (!/^[a-f0-9]{40}$/.test(headSha ?? '') || headSha?.length !== 40
      || headSha !== mainSha) {
    throw new Error(`Stale production deployment: tested ${headSha ?? '(missing)'}, current main ${mainSha ?? '(missing)'}`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv[2] === 'preview') console.log(previewBranch(process.argv[3]));
  else if (process.argv[2] === 'event') {
    const branch = deploymentBranch({
      eventName: process.env.GITHUB_EVENT_NAME,
      event: JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8')),
      repository: process.env.GITHUB_REPOSITORY,
      preview: process.env.PREVIEW_BRANCH,
    });
    console.log(`PAGES_DEPLOY_BRANCH=${branch}`);
  } else if (process.argv[2] === 'freshness') {
    const branch = process.argv[3];
    if (branch === 'main') {
      // 🤖 A rerun for an old successful SHA must not roll back a newer main.
      execFileSync('git', ['fetch', '--no-tags', 'origin', '+refs/heads/main:refs/remotes/origin/main'], { stdio: 'inherit' });
      const revision = (ref) => execFileSync('git', ['rev-parse', ref], { encoding: 'utf8' }).trim();
      assertDeploymentFreshness({ branch, headSha: revision('HEAD'), mainSha: revision('refs/remotes/origin/main') });
    } else assertDeploymentFreshness({ branch });
  } else throw new Error('Usage: node deploy/deploy-target.mjs preview <branch>|event|freshness <branch>');
}
