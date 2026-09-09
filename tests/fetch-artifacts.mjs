// 🤖 Fetch the checked-in release fixture, authenticate it before extraction,
// 🤖 then check the full runtime bytes and the NODEFS library's Lean identity.
import fs from 'node:fs';
import { promises as fsp } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRelease, repoRoot, verifyFixture } from '../deploy/runtime-release.mjs';
import { downloadArchive, extractArchive, validateArchiveEntries as validateEntries } from '../deploy/archive.mjs';

const fixturePath = (name) => /^(bin|lib|runtime)(\/|$)/.test(name);
export const validateArchiveEntries = (names, details) => validateEntries(names, details, fixturePath);

export async function fetchArtifacts({ release = loadRelease(), out, fetchImpl = fetch }) {
  out = path.resolve(out || process.env.LEAN_ROOT || path.join(repoRoot, 'tests/.artifacts'));
  await fsp.mkdir(path.dirname(out), { recursive: true });
  const stage = await fsp.mkdtemp(path.join(path.dirname(out), '.lean-fixtures-'));
  const archive = path.join(stage, 'fixture.tar.gz');
  const extracted = path.join(stage, 'extracted');
  const backup = path.join(stage, 'previous');
  let backedUp = false;
  try {
    console.log(`Fetching pinned fixture ${release.assetVersion} from ${release.fixture.url}`);
    await downloadArchive(release.fixture, archive, fetchImpl);
    extractArchive(archive, extracted, fixturePath);
    await verifyFixture(extracted, release);
    // 🤖 Pthreads load this glue as CommonJS, even inside this ESM repository.
    await fsp.writeFile(path.join(extracted, 'bin/package.json'), '{ "type": "commonjs" }\n');
    if (fs.existsSync(out)) {
      if (fs.lstatSync(out).isSymbolicLink()) throw new Error(`Refusing to replace symlink fixture root: ${out}`);
      await fsp.rename(out, backup);
      backedUp = true;
    }
    try {
      await fsp.rename(extracted, out);
    } catch (error) {
      if (backedUp) await fsp.rename(backup, out);
      throw error;
    }
    console.log(`Verified fixtures ready: ${out}`);
  } finally {
    await fsp.rm(stage, { recursive: true, force: true });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await fetchArtifacts({});
}
