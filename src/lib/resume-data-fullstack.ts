/**
 * Tailored resume data — Full Stack Developer, Mater Private Network.
 *
 * Every bullet point maps to real experience already documented in
 * the main resume-data.ts. Content is reframed and keyword-aligned
 * for the Full Stack Developer position — nothing fabricated.
 */

import type { ResumeData } from './resume-data'

export const resumeDataFullstack: ResumeData = {
  profile: {
    name: 'Nelson Lamounier',
    title: 'Full Stack Developer — React, TypeScript & Cloud',
    location: 'Dublin, Ireland',
    email: 'lamounierleao@outlook.com',
    linkedin: 'linkedin.com/in/nelson-lamounier-leao',
    github: 'github.com/Nelson-Lamounier',
    website: 'nelsonlamounier.com',
  },

  summary:
    'Full Stack Developer with hands-on experience building production-grade web applications using React, Next.js, TypeScript, and Node.js. Designed and developed responsive, server-rendered frontends with component-based architecture, RESTful API backends with Lambda and API Gateway, and DynamoDB data persistence layers with single-table design patterns. Built and maintained CI/CD pipelines with automated testing, linting, and deployment workflows using GitHub Actions. Comfortable working across the full stack — from accessible UI components and client-side state management to backend API design, database modelling, and containerised deployment on AWS. Strong foundation in secure coding practices, production monitoring, and cross-functional collaboration from three years at Amazon Web Services supporting enterprise application workloads.',

  keyAchievements: [
    {
      achievement:
        'Built and deployed a production Next.js 15 web application with React Server Components, TypeScript, responsive design, SEO optimisation, and OpenTelemetry instrumentation for end-to-end observability',
    },
    {
      achievement:
        'Developed serverless REST APIs with Lambda, API Gateway, and DynamoDB single-table design — implementing JSON schema request validation, error handling, and automated integration testing',
    },
    {
      achievement:
        'Designed CI/CD pipelines with GitHub Actions featuring automated linting, unit testing, build verification, and deployment workflows across staging and production environments',
    },
    {
      achievement:
        'Debugged and resolved full-stack application issues at AWS across compute, networking, IAM, and database layers — developing systematic troubleshooting skills applicable to complex production systems',
    },
  ],

  experience: [
    {
      company: 'Amazon Web Services (AWS)',
      title: 'Technical Customer Service Associate',
      period: '2022 – Present',
      highlights: [
        'Investigated and resolved application deployment failures across ECS and Lambda, debugging task definitions, API configurations, networking rules, container health checks, and IAM execution roles — developing deep understanding of full-stack production systems',
        'Analysed and troubleshot RESTful API issues across API Gateway, Lambda, and backend services, diagnosing request routing, authentication failures, CORS configurations, and response handling for customer-facing applications',
        'Supported database-backed application workloads, troubleshooting DynamoDB throughput issues, query performance, and data access patterns to help customers optimise their application data layers',
        'Collaborated directly with engineering teams on technical escalations, documenting findings and reproducing issues across frontend, backend, and infrastructure components to accelerate resolution',
        'Used CloudWatch metrics, log correlation, and distributed tracing to monitor application health, identify performance bottlenecks, and recommend improvements for production web applications',
      ],
    },
    {
      company: 'Freelance',
      title: 'Full Stack Developer & Cloud Engineer',
      period: '2022 – Present (Part-time)',
      highlights: [
        'Built a production Next.js 15 portfolio application with React, TypeScript, and Tailwind CSS — implementing responsive layouts, server-side rendering, dynamic routing, and accessible UI components following modern web standards',
        'Developed RESTful APIs using AWS Lambda and API Gateway with DynamoDB as the persistence layer, implementing single-table design with GSI access patterns, JSON schema validation, and per-function error handling',
        'Created reusable React components (resume preview, article rendering, newsletter forms) with proper state management, client-side validation, and integration with backend APIs',
        'Implemented OpenTelemetry instrumentation across the full stack for request tracing, performance monitoring, and error tracking — integrating with Grafana, Loki, and Tempo for observability',
        'Built GitHub Actions CI/CD pipelines with automated linting (ESLint), type checking (TypeScript), unit testing (Jest), build verification, and containerised deployment to AWS ECS',
      ],
    },
    {
      company: 'Meta via Accenture',
      title: 'Quality Assurance Analyst',
      period: '2021 – 2022',
      highlights: [
        'Configured and tested enterprise platform deployments on Meta\'s ad infrastructure, verifying application functionality, tracking performance metrics, and ensuring reliable campaign delivery across distributed systems',
        'Built SQL-based monitoring dashboards and data queries to track platform health metrics, enabling proactive identification of application issues before they impacted end users',
        'Wrote standardised testing procedures and reusable configuration templates that improved team efficiency and reduced resolution times for recurring application issues',
        'Collaborated with cross-functional engineering teams to identify quality improvements, streamline testing workflows, and ensure consistent application behaviour across environments',
      ],
    },
  ],

  certifications: [
    {
      name: 'AWS Certified DevOps Engineer – Professional',
      issuer: 'Amazon Web Services',
      year: '2024',
    },
  ],

  skills: [
    {
      category: 'Frontend Development',
      skills: [
        'React, Next.js 15, Server Components',
        'TypeScript, JavaScript (ES6+)',
        'HTML5, CSS3, Tailwind CSS',
        'Responsive Design, Accessibility (a11y)',
        'Component-Based Architecture',
      ],
    },
    {
      category: 'Backend & API Development',
      skills: [
        'Node.js, Next.js API Routes',
        'RESTful API Design (Lambda, API Gateway)',
        'JSON Schema Validation, Error Handling',
        'Server-Side Rendering (SSR), ISR',
        'Authentication & Authorisation (IAM, OIDC)',
      ],
    },
    {
      category: 'Database & Data',
      skills: [
        'DynamoDB (Single-Table Design, GSI Patterns)',
        'SQL (Queries, Dashboards, Data Analysis)',
        'Data Modelling & Access Patterns',
        'S3 Object Storage, Content Management',
      ],
    },
    {
      category: 'DevOps & CI/CD',
      skills: [
        'GitHub Actions (Reusable Workflows, OIDC)',
        'Docker, Docker Compose, ECS',
        'Automated Testing (Jest, Integration Tests)',
        'ESLint, TypeScript Strict Mode',
        'Infrastructure as Code (AWS CDK, CloudFormation)',
      ],
    },
    {
      category: 'Cloud & Infrastructure (AWS)',
      skills: [
        'EC2, ECS, Lambda, API Gateway, S3',
        'VPC, Security Groups, IAM, CloudFront',
        'CloudWatch, CloudTrail, X-Ray',
        'Route 53, ACM, WAF, KMS',
      ],
    },
    {
      category: 'Tools & Practices',
      skills: [
        'Git, GitHub, Code Review',
        'Agile Development, User Stories',
        'OpenTelemetry, Grafana, Prometheus',
        'Secure Coding, GDPR Awareness',
        'Technical Documentation',
      ],
    },
  ],

  education: [
    {
      degree: 'Higher Diploma in Science in Computing (Web & Cloud Technologies)',
      institution: 'Dublin Business School, Dublin, Ireland',
      period: 'September 2022 – September 2024',
    },
    {
      degree: 'BA (Honours) in Digital Marketing and Cloud Computing',
      institution: 'Dublin Business School, Dublin, Ireland',
      period: 'September 2016 – April 2020',
    },
  ],

  projects: [
    {
      name: 'Full Stack Portfolio Application',
      description:
        'Designed and built a production Next.js 15 web application with React Server Components, TypeScript, and Tailwind CSS — featuring dynamic article rendering from DynamoDB/S3 content sources, server-side rendering with ISR revalidation, responsive layouts across breakpoints, SEO optimisation with meta tags and structured data, and OpenTelemetry instrumentation for full-stack observability. Implemented reusable component architecture (resume preview/download, newsletter subscription, article cards) with client-side state management and backend API integration. Built the CI/CD pipeline with GitHub Actions automating ESLint, TypeScript checks, Jest tests, Docker image builds, and containerised deployment to AWS ECS behind CloudFront CDN with WAF protection.',
      github: 'github.com/Nelson-Lamounier/frontend-portfolio',
    },
    {
      name: 'Serverless Content API',
      description:
        'Developed a RESTful API backend using AWS Lambda and API Gateway with DynamoDB as the persistence layer, implementing single-table design with GSI access patterns for efficient query performance. Built JSON schema request validation for type-safe API contracts, per-function dead letter queues for error resilience, and HMAC token verification for secure webhook integration. Implemented cross-region DNS validation for automated TLS certificate provisioning and OIDC-authenticated CI/CD deployment pipeline with GitHub Actions. The API serves as the content backend for the portfolio application, managing article metadata, content delivery, and newsletter subscriptions.',
      github: 'github.com/Nelson-Lamounier/cdk-monitoring',
    },
  ],
}
