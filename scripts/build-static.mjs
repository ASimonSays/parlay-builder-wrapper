import { access, cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const config=JSON.parse(await readFile(path.join(root,'app/config/builds.json'),'utf8'));
const template=await readFile(path.join(root,'app/src/index.template.html'),'utf8');
const outputRoot=path.join(root,'build');
const sharedAssets=['ssb_full_logo_web_768.png','ssb-share-v3.png'];
const assetSets={
  gold:['ssb-gold-v1.ico','ssb-gold-v1-64.png','ssb-gold-v1-128.png','ssb-gold-touch-v1-180.png','ssb-gold-v1-192.png','ssb-gold-v1-512.png','manifest-gold-v1.json'],
  silver:['favicon.ico','ssb-favicon-v3-64.png','ssb-favicon-v3-128.png','ssb-touch-v3-180.png','manifest.json']
};
const exists=async file=>access(file).then(()=>true).catch(()=>false);
const render=(source,values)=>source.replace(/\{\{([A-Z_]+)\}\}/g,(_,key)=>{if(!(key in values))throw new Error(`Missing build token ${key}`);return String(values[key])});
await rm(outputRoot,{recursive:true,force:true});await mkdir(outputRoot,{recursive:true});
for(const [buildName,build] of Object.entries(config)){
  const destination=path.join(outputRoot,buildName);await mkdir(destination,{recursive:true});
  const values={BUILD_NAME:buildName,THEME_NAME:build.themeName,CANONICAL_URL:build.canonicalUrl,ACCENT:build.accent,ICON:build.icon,TOUCH_ICON:build.touchIcon,MANIFEST:build.manifest,SHARE_IMAGE:build.shareImage,LOGO:build.logo};
  await writeFile(path.join(destination,'index.html'),render(template,values));
  await writeFile(path.join(destination,'theme.css'),`:root{--accent:${build.accent};--accent-soft:${build.accentSoft};--surface-top:${build.surfaceTop};--surface-bottom:${build.surfaceBottom}}\n`);
  await cp(path.join(root,'app/src/styles/app.css'),path.join(destination,'app.css'));await cp(path.join(root,'app/src/styles/dashboard.css'),path.join(destination,'dashboard.css'));
  const scripts=[...template.matchAll(/<script\s+src="\.\/([^"]+)"/g)].map(match=>match[1]);for(const script of scripts)await cp(path.join(root,'app/src/scripts',script),path.join(destination,script));
  for(const asset of [...sharedAssets,...(assetSets[buildName]||[])]){const source=path.join(root,asset);if(!await exists(source))throw new Error(`${buildName}: required build asset missing: ${asset}`);await cp(source,path.join(destination,asset))}
  await writeFile(path.join(destination,'CNAME'),`${build.domain}\n`);await writeFile(path.join(destination,'BUILD.json'),`${JSON.stringify({build:buildName,domain:build.domain,source:'canonical-app'},null,2)}\n`);
}
console.log(`Built ${Object.keys(config).join(' and ')} from one canonical source.`);
