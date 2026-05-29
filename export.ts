import * as fs from 'fs';
import * as path from 'path';

function walk(dir: string): string[] {
  let results: string[] = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.css')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('src');

// Add the UI UX Spec file manually
files.unshift('FLUTTERFLOW_UI_UX_SPEC.md');

let out = '';
for (const f of files) {
  out += '// ==========================================\n';
  out += '// Fichier : ' + f + '\n';
  out += '// ==========================================\n';
  out += fs.readFileSync(f, 'utf8') + '\n\n';
}

fs.writeFileSync('CODE_COMPLET.txt', out);
console.log('CODE_COMPLET.txt generated successfully.');