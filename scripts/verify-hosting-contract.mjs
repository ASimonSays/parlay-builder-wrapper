#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const failures=[];
const check=(condition,message)=>{if(!condition)failures.push(message)};
const read=(name)=>readFileSync(join(root,name),"utf8");

const required=[
  "index.html","CNAME","manifest-gold-v1.json","library-backup.js",
  "ssb-gold-v1.ico","ssb-gold-v1-64.png","ssb-gold-v1-128.png",
  "ssb-gold-touch-v1-180.png","ssb-gold-v1-192.png","ssb-gold-v1-512.png",
  "ssb-share-v3.png","simon-sports-betting-nameplate.png",
  "ssb_emblem_webapp_box_transparent_768.png"
];
required.forEach(name=>check(existsSync(join(root,name)),`Missing required app asset: ${name}`));

const cname=read("CNAME").trim();
const index=read("index.html");
check(cname==="simonsports.bet","App CNAME must be simonsports.bet");
check(index.includes("const goldHost=true;"),"Gold identity must belong to the app repo, not host detection");
check(index.includes('content="https://simonsports.bet/"'),"Missing final .bet social URL");
check(index.includes('https://simonsports.bet/ssb-share-v3.png'),"Missing final .bet share image");
check(index.includes('./manifest-gold-v1.json'),"Missing local gold manifest reference");
check(index.includes('./ssb-gold-v1.ico'),"Missing local gold favicon reference");
check(!index.includes("simonsportsbetting.com"),"App index still references the public .com domain");
check(!index.includes("https://superl0ng.github.io/parlay-tracker/"),"App index still uses the old project-page identity URL");
check(!index.includes("manifest-v2.json"),"App index still contains silver manifest fallback");
check(!index.includes("ssb-favicon-v3"),"App index still contains silver icon fallback");
check(index.includes("raw.githubusercontent.com/SuperL0ng/parlay-tracker/"),"Historical base source contract is missing");
check(read("navigation-links-v24.js").includes("data-library-backup"),"Whole-library backup loader is missing");

const manifest=JSON.parse(read("manifest-gold-v1.json"));
check(manifest.start_url==="/","Gold manifest start_url must be /");
check(manifest.theme_color==="#c79442","Gold manifest theme color is wrong");
for(const icon of manifest.icons||[]){
  const rel=String(icon.src||"").replace(/^\.\//,"");
  check(existsSync(join(root,rel)),`Missing gold manifest icon: ${rel}`);
}

for(const match of index.matchAll(/src=["']\.\/([^?"']+)/g)){
  check(existsSync(join(root,match[1])),`Missing local script or image: ${match[1]}`);
}

if(failures.length){
  console.error("App deployment contract failed:");
  failures.forEach(item=>console.error(`- ${item}`));
  process.exit(1);
}
console.log("Gold app deployment contract verified.");
