import assert from 'node:assert/strict';
import { test } from 'node:test';
import { deploymentBranch, previewBranch, assertDeploymentFreshness } from '../deploy/deploy-target.mjs';

const production = {
  eventName: 'workflow_run', repository: 'cauli/lean4-wasm-in-browser',
  event: { workflow_run: { conclusion: 'success', event: 'push', head_branch: 'main', head_repository: { full_name: 'cauli/lean4-wasm-in-browser' } } },
};

test('manual deployments can only select an explicit safe preview branch', () => {
  assert.equal(previewBranch('preview-compact1'), 'preview-compact1');
  for (const value of [undefined, '', 'main', 'production', 'preview-', 'preview-X', 'preview-a\n', 'preview-a\nPAGES_DEPLOY_BRANCH=main', 'preview-$(whoami)']) {
    assert.throws(() => previewBranch(value), /Manual deploy requires/);
  }
  assert.equal(deploymentBranch({ ...production, eventName: 'workflow_dispatch', preview: 'preview-test' }), 'preview-test');
  assert.throws(() => deploymentBranch({ ...production, eventName: 'workflow_dispatch', preview: 'main' }));
});

test('production requires a successful same-repository push gate on main, never a manual gate', () => {
  assert.equal(deploymentBranch(production), 'main');
  for (const patch of [{ event: 'workflow_dispatch' }, { event: 'pull_request' }, { conclusion: 'failure' }, { head_branch: 'release/candidate' }, { head_repository: { full_name: 'fork/repo' } }]) {
    const options = structuredClone(production);
    Object.assign(options.event.workflow_run, patch);
    assert.throws(() => deploymentBranch(options), /Production requires/);
  }
  assert.throws(() => deploymentBranch({ ...production, eventName: 'push' }), /Production requires/);
});

test('production rejects stale successful SHAs while previews need not match main', () => {
  const headSha = 'a'.repeat(40);
  const newerMain = 'b'.repeat(40);
  assert.doesNotThrow(() => assertDeploymentFreshness({ branch: 'main', headSha, mainSha: headSha }));
  assert.throws(() => assertDeploymentFreshness({ branch: 'main', headSha, mainSha: newerMain }), /Stale production deployment/);
  assert.throws(() => assertDeploymentFreshness({ branch: 'main' }), /Stale production deployment/);
  assert.doesNotThrow(() => assertDeploymentFreshness({ branch: 'preview-old-candidate', headSha, mainSha: newerMain }));
  assert.doesNotThrow(() => assertDeploymentFreshness({ branch: 'preview-independent' }));
});
