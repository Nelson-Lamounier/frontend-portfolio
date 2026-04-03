const fs = require('fs');
const path = require('path');

function replaceInDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      replaceInDir(fullPath);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf-8');
      let newContent = content
        .replace(/@\/lib\//g, '@repo/shared/lib/')
        .replace(/@\/components\//g, '@repo/shared/components/')
        .replace(/@\/hooks\//g, '@repo/shared/hooks/')
        .replace(/@\/types\//g, '@repo/shared/types/')
        .replace(/@\/app\/providers/g, '@repo/shared/components/providers');
        
      if (content !== newContent) {
        fs.writeFileSync(fullPath, newContent, 'utf-8');
        console.log('Fixed:', fullPath);
      }
    }
  }
}

replaceInDir('/Users/nelsonlamounier/Desktop/portfolio/frontend-portfolio/apps/site/__tests__');
