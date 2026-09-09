// 🤖 Keep manual previews separate from the only automatic production path.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
  } else throw new Error('Usage: node deploy/deploy-target.mjs preview <branch>|event');
}
