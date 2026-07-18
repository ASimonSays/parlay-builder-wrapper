import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(await readFile(path.join(root, 'app/config/builds.json'), 'utf8'));
const template = await readFile(path.join(root, 'app/src/index.template.html'), 'utf8');
const outputRoot = path.join(root, 'build');

await rm(outputRoot, { recursive: true, force: true });
await mkdir(outputRoot, { recursive: true });

function render(source, values) {
  return source.replace(/\{\{([A-Z_]+)\}\}/g, (_, key) => {
    if (!(key in values)) throw new Error(`Missing build token ${key}`);
    return String(values[key]);
  });
}

for (const [buildName, build] of Object.entries(config)) {
  const destination = path.join(outputRoot, buildName);
  await mkdir(destination, { recursive: true });
  const values = {
    BUILD_NAME: buildName,
    THEME_NAME: build.themeName,
    CANONICAL_URL: build.canonicalUrl,
    ACCENT: build.accent,
    ICON: build.icon,
    TOUCH_ICON: build.touchIcon,
    MANIFEST: build.manifest,
    SHARE_IMAGE: build.shareImage
  };
  await writeFile(path.join(destination, 'index.html'), render(template, values));
  await writeFile(path.join(destination, 'theme.css'), `:root{--accent:${build.accent};--accent-soft:${build.accentSoft};--surface-top:${build.surfaceTop};--surface-bottom:${build.surfaceBottom}}\n`);
  await cp(path.join(root, 'app/src/styles/app.css'), path.join(destination, 'app.css'));
  await cp(path.join(root, 'app/src/styles/dashboard.css'), path.join(destination, 'dashboard.css'));
  await cp(path.join(root, 'app/src/scripts/storage.js'), path.join(destination, 'storage.js'));
  await cp(path.join(root, 'app/src/scripts/dashboard-controller.js'), path.join(destination, 'dashboard-controller.js'));
  await cp(path.join(root, 'app/src/scripts/bootstrap.js'), path.join(destination, 'bootstrap.js'));
  await writeFile(path.join(destination, 'BUILD.json'), `${JSON.stringify({ build: buildName, domain: build.domain, source: 'canonical-app' }, null, 2)}\n`);
}

console.log(`Built ${Object.keys(config).join(' and ')} from one canonical source.`);
