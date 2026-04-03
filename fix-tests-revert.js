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
        // Undo the intermediate state and set to the correct local aliases
        .replace(/@repo\/shared\/lib\/articles\/article-service/g, '@/lib/articles/article-service')
        .replace(/@repo\/shared\/lib\/articles\/dynamodb-articles/g, '@/lib/articles/dynamodb-articles')
        .replace(/@repo\/shared\/lib\/observability\/analytics/g, '@/lib/observability/analytics')
        .replace(/@repo\/shared\/lib\/observability\/metrics/g, '@/lib/observability/metrics')
        .replace(/@repo\/shared\/lib\/rate-limiter/g, '@/lib/rate-limiter')
        
        // Let's also revert any leftover @repo/shared string literals in the tests back to their correct path 
        .replace(/@repo\/shared\/components\/providers\/index/g, '@/app/providers')
        .replace(/@repo\/shared\/components\/providers/g, '@/app/providers')
        .replace(/@repo\/shared\/components\//g, '@/components/')
        .replace(/@repo\/shared\/hooks\//g, '@/hooks/')
        .replace(/@repo\/shared\/types\//g, '@/types/')
        .replace(/@repo\/shared\/lib\//g, '@/lib/');

      if (content !== newContent) {
        fs.writeFileSync(fullPath, newContent, 'utf-8');
        console.log('Fixed imports in:', fullPath);
      }
    }
  }
}

replaceInDir('/Users/nelsonlamounier/Desktop/portfolio/frontend-portfolio/apps/site/__tests__');
