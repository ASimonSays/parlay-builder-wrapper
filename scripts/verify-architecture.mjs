import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const builds = ['gold', 'silver'];
const forbidden = [
  'show-legs-label-fix.js',
  'dashboard-layout-v56.js',
  'dashboard-refresh-v58.js',
  'dashboard-polish-v63.js',
  'dashboard-more-actions-v64.js',
  'dashboard-sort-filter-v78.js',
  'document.write(',
  'raw.githubusercontent.com/SuperL0ng/parlay-tracker/'
];

for (const build of builds) {
  const directory = path.join(root, 'build', build);
  const html = await readFile(path.join(directory, 'index.html'), 'utf8');
  const dashboard = await readFile(path.join(directory, 'dashboard-controller.js'), 'utf8');
  const storage = await readFile(path.join(directory, 'storage.js'), 'utf8');
  const scripts = [...html.matchAll(/<script\s+src="([^"]+)"/g)].map(match => match[1]);
  const styles = [...html.matchAll(/<link\s+rel="stylesheet"\s+href="([^"]+)"/g)].map(match => match[1]);

  if (scripts.filter(src => src.endsWith('dashboard-controller.js')).length !== 1) throw new Error(`${build}: dashboard controller count is not one`);
  if (styles.filter(src => src.endsWith('dashboard.css')).length !== 1) throw new Error(`${build}: dashboard stylesheet count is not one`);
  if (!storage.includes('parlayTracker.savedTickets.v1')) throw new Error(`${build}: localStorage key changed`);
  if (!dashboard.includes('recordsForRender()')) throw new Error(`${build}: sort-before-render owner missing`);
  if (!dashboard.includes('article.dataset.ticketId = id')) throw new Error(`${build}: stable ticket ID binding missing`);
  for (const needle of forbidden) {
    if (`${html}\n${dashboard}\n${storage}`.includes(needle)) throw new Error(`${build}: forbidden architecture dependency ${needle}`);
  }
}

const goldDashboard = await readFile(path.join(root, 'build/gold/dashboard-controller.js'), 'utf8');
const silverDashboard = await readFile(path.join(root, 'build/silver/dashboard-controller.js'), 'utf8');
if (goldDashboard !== silverDashboard) throw new Error('Gold and silver dashboard controllers differ.');
const goldCss = await readFile(path.join(root, 'build/gold/dashboard.css'), 'utf8');
const silverCss = await readFile(path.join(root, 'build/silver/dashboard.css'), 'utf8');
if (goldCss !== silverCss) throw new Error('Gold and silver dashboard stylesheets differ.');

console.log('Architecture verification passed.');
