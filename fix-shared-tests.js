const fs = require('fs');
const path = require('path');

function replaceInDir(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      replaceInDir(fullPath);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf-8');
      
      let newContent = content
        .replace(/@repo\/shared\/lib\/article-service/g, '@repo/shared/lib/articles/article-service')
        .replace(/@repo\/shared\/lib\/dynamodb-articles/g, '@repo/shared/lib/articles/dynamodb-articles')
        .replace(/@repo\/shared\/lib\/analytics/g, '@repo/shared/lib/observability/analytics')
        .replace(/@repo\/shared\/lib\/metrics/g, '@repo/shared/lib/observability/metrics')
        .replace(/@repo\/shared\/components\/providers/g, '@repo/shared/components/providers/index'); // if needed, although dir import usually works. Actually, keeping it as is should work for providers.

      if (content !== newContent) {
        fs.writeFileSync(fullPath, newContent, 'utf-8');
        console.log('Fixed imports in:', fullPath);
      }
    }
  }
}

replaceInDir('/Users/nelsonlamounier/Desktop/portfolio/frontend-portfolio/apps/site/__tests__');
