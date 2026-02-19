/**
 * Centralised resume data module.
 *
 * All resume content lives here so the ResumeDocument component
 * and any future resume-related features (e.g. API, preview page)
 * can share a single source of truth.
 */

export interface ResumeProfile {
  name: string
  title: string
  location: string
  email: string
  linkedin: string
  github: string
  website: string
}

export interface ResumeExperience {
  company: string
  title: string
  period: string
  highlights: string[]
}

export interface ResumeCertification {
  name: string
  issuer: string
  year: string
}

export interface ResumeEducation {
  degree: string
  institution: string
  period: string
  details?: string
}

export interface ResumeSkillGroup {
  category: string
  skills: string[]
}

export interface ResumeProject {
  name: string
  description: string
  github: string
}

export interface ResumeAchievement {
  achievement: string
}

export interface ResumeData {
  profile: ResumeProfile
  summary: string
  keyAchievements: ResumeAchievement[]
  experience: ResumeExperience[]
  certifications: ResumeCertification[]
  skills: ResumeSkillGroup[]
  education: ResumeEducation[]
  projects: ResumeProject[]
}

export const resumeData: ResumeData = {
  profile: {
    name: 'Nelson Lamounier',
    title: 'AWS Certified Cloud Architect & DevOps Engineer',
    location: 'Dublin, Ireland',
    email: 'lamounierleao@outlook.com',
    linkedin: 'linkedin.com/in/nelson-lamounier-leao',
    github: 'github.com/Nelson-Lamounier',
    website: 'nelsonlamounier.com',
  },

  summary:
    'Certified AWS DevOps Engineer — Professional with practical experience in Infrastructure as Code, troubleshooting, policy-as-code analysis, and cross-functional collaboration with Site Reliability Engineers and platform teams. Skilled in analysing CloudTrail API activity logs, debugging IAM permission boundaries, and resolving deployment failures across containerised application workloads. Strong foundation in automation, security operations, and FinOps methodologies, with hands-on experience using AWS CLI and SDKs for infrastructure investigation. Seeking to transition from customer-facing cloud operations to hands-on DevOps Engineering, leveraging AWS expertise, security incident response experience, and proven troubleshooting capabilities to build, deploy, and maintain scalable cloud infrastructure. Passionate about infrastructure automation, continuous improvement, and applying DevOps best practices to solve complex technical challenges.',

  keyAchievements: [
    {
      achievement:
        'Architected a 6-stack IaC platform (AWS CDK, TypeScript), consolidating 14+ legacy CloudFormation stacks into domain-aligned infrastructure with SSM-based cross-stack service discovery',
    },
    {
      achievement:
        'Built zero-credential CI/CD pipelines with GitHub Actions OIDC, policy-as-code scanning (Checkov), infrastructure drift detection, automated smoke tests, and rollback-on-failure strategies',
    },
    {
      achievement:
        'Deployed a self-hosted observability platform (Prometheus, Grafana, Loki, Tempo) as a 7-container Docker Compose stack with DNS-based service discovery and automated health verification',
    },
    {
      achievement:
        'Hardened ECS container workloads with non-root execution, dropped Linux capabilities, init process (tini), awsvpc network isolation, and sidecar containers for log forwarding and distributed tracing',
    },
    {
      achievement:
        'Triaged security incidents at AWS involving compromised IAM access keys — analysing CloudTrail API activity, coordinating credential rotation, and debugging permission boundaries and cross-account role assumptions',
    },
    {
      achievement:
        'Developed serverless REST APIs with Lambda, API Gateway, and DynamoDB single-table design, implementing JSON schema validation, per-function dead letter queues, and HMAC token verification',
    },
  ],

  experience: [
    {
      company: 'Amazon Web Services (AWS)',
      title: 'Technical Customer Service Associate',
      period: '2022 – Present',
      highlights: [
        'Triaged security incidents involving compromised IAM access keys by analysing CloudTrail API activity for unauthorised resource creation, coordinating credential rotation procedures, enforcing MFA policies, and debugging IAM policy documents, trust relationships, permission boundaries, and cross-account role assumptions to restore secure access',
        'Investigated ECS deployment failures by examining task definition configurations, IAM task execution role permissions, ECR image pull authentication, VPC networking and security group rules, container health check parameters, and service event logs — identifying root causes across compute, networking, and IAM layers',
        'Analysed infrastructure cost drivers using CloudTrail API logs, Cost Explorer, and Trusted Advisor, identifying unattached EBS volumes, idle Elastic IPs, data transfer anomalies, misconfigured Auto Scaling policies, oversized EC2 instances, and inefficient storage classes to recommend optimisation strategies',
        'Debugged cross-service issues using AWS CLI and Console across CloudFront cache behaviours, Security Hub compliance findings, KMS key policies and grants, OpenSearch cluster access policies, and SES sending configurations — applying systematic log correlation and resource-level investigation methodologies',
        'Collaborated directly with AWS Support Engineers on technical escalations, documenting infrastructure findings across security group misconfigurations, IAM permission boundaries, VPC routing, and ECS task definitions to accelerate resolution and reduce escalation response times',
      ],
    },
    {
      company: 'Freelance',
      title: 'Freelance Software Engineer',
      period: '2022 – Present (Part-time)',
      highlights: [
        'Engineered multi-stack IaC architectures using AWS CDK (TypeScript), designing modular stack separation by change-frequency domain with inter-stack service discovery via SSM parameters, eliminating tight CloudFormation export coupling across compute, networking, storage, and edge layers',
        'Built GitHub Actions CI/CD pipelines with OIDC authentication (no static credentials), policy-as-code scanning (Checkov), CloudFormation template validation, infrastructure drift detection, automated smoke tests, and rollback-on-failure strategies across multi-environment deployments',
        'Hardened containerised ECS workloads with non-root user execution, dropped Linux capabilities, init process (tini), awsvpc network isolation, per-task security groups, and implemented sidecar container patterns for log forwarding and distributed trace collection',
        'Developed serverless REST APIs using Lambda and API Gateway with DynamoDB single-table design, JSON schema request validation, per-function dead letter queues, HMAC token verification, and cross-region DNS validation for TLS certificate provisioning',
      ],
    },
    {
      company: 'Meta via Accenture',
      title: 'Quality Assurance Analyst',
      period: '2021 – 2022',
      highlights: [
        'Configured and troubleshot enterprise platform deployments on Meta\'s ad infrastructure, ensuring reliable campaign delivery and optimising performance metrics across distributed systems',
        'Developed reusable configuration templates and standardised operational documentation, improving cross-team efficiency and reducing resolution times for recurring platform issues',
        'Built SQL-based monitoring dashboards and correlation queries to track platform performance metrics, enabling data-driven analysis and proactive issue identification',
        'Collaborated with cross-functional engineering and support teams to identify process improvements, reduce escalation response times, and streamline operational workflows',
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
      category: 'Cloud & Infrastructure',
      skills: [
        'AWS (EC2, ECS, VPC, IAM, S3, DynamoDB, Lambda, CloudFront, Route 53, ACM, WAF, CloudWatch, CloudTrail, Cost Explorer, Trusted Advisor, Security Hub, KMS, SES, SSM, API Gateway)',
        'Infrastructure as Code (AWS CDK, CloudFormation)',
        'Docker, Docker Compose, ECR',
        'Auto Scaling, Load Balancing (ALB)',
        'Serverless Architecture',
      ],
    },
    {
      category: 'CI/CD & Automation',
      skills: [
        'GitHub Actions (Reusable Workflows, OIDC Authentication)',
        'Policy-as-Code (Checkov, CDK-Nag)',
        'Infrastructure Drift Detection',
        'Automated Smoke Testing',
        'Rollback Strategies',
        'Golden Artifact Pattern (Docker Image Digest)',
      ],
    },
    {
      category: 'Monitoring & Observability',
      skills: [
        'Prometheus, Grafana, Loki, Tempo',
        'OpenTelemetry (OTLP)',
        'AWS CloudWatch, X-Ray',
        'Log Aggregation, Distributed Tracing',
        'DNS-based Service Discovery (Cloud Map)',
      ],
    },
    {
      category: 'Security & Compliance',
      skills: [
        'IAM Policies, Permission Boundaries, Trust Relationships',
        'Credential Rotation, MFA Enforcement',
        'Container Hardening (Non-root, CAP_DROP, Init Process)',
        'WAF Rule Management (OWASP Top 10, Rate Limiting)',
        'DevSecOps, Shift-Left Security',
      ],
    },
    {
      category: 'Networking & Linux',
      skills: [
        'TCP/IP, DNS, HTTP/HTTPS, gRPC, TLS',
        'VPC, Subnets, Security Groups, ENI',
        'Linux Administration (Bash, chmod/chown, systemd, SSH)',
        'CloudFront CDN, Multi-Origin Routing',
      ],
    },
    {
      category: 'Languages & Tools',
      skills: [
        'TypeScript, Python, Bash, SQL',
        'Git, GitHub',
        'Node.js, Next.js, React',
        'AWS CLI & SDKs',
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
      name: 'Monitoring & Observability Platform',
      description:
        'Architected and deployed a self-hosted observability platform addressing the lack of unified monitoring, log aggregation, and distributed tracing across containerised workloads. Designed a modular 3-stack IaC architecture (AWS CDK, TypeScript) separating Storage (encrypted block storage, automated backup lifecycle policies), Configuration Management (remote command execution, object storage provisioning), and Compute (auto scaling, launch templates, security groups) — deploying Prometheus, Grafana, Loki, and Tempo as a 7-container Docker Compose stack with persistent volume storage surviving instance replacements. Configured networking with HTTP/TCP scrape endpoints, gRPC (OTLP) trace ingestion across VPC subnets, and applied Linux file permissions (chmod/chown) to secure configuration files and persistent data directories on the host. Implemented DNS-based service discovery for automated scrape target registration, idempotent instance configuration via state management associations, and OpenTelemetry instrumentation for end-to-end request tracing. Built the GitHub Actions CI/CD pipeline with policy-as-code security scanning (Checkov), infrastructure drift detection, automated smoke tests validating container health, HTTP endpoints, datasource connectivity, and scrape targets — with automated infrastructure rollback on verification failure.',
      github: 'github.com/Nelson-Lamounier/cdk-monitoring',
    },
    {
      name: 'Cloud-Native Application Platform',
      description:
        'Designed and deployed a production-grade containerised web application platform using a 6-stack IaC architecture (AWS CDK, TypeScript) organised by change-frequency domains — Data, Compute, Networking, Application, API, and Edge — consolidated from 14+ legacy stacks. Hardened container security with non-root user execution (UID 1001), dropped all Linux capabilities (CAP_DROP ALL), init process (tini) for zombie process reaping, tmpfs mounts for ephemeral cache, and NOFILE ulimits (65536). Configured awsvpc networking with per-task ENI isolation, TCP/HTTP health checks on port 3000, and security group rules restricting ingress to load balancer and monitoring sources only. Built multi-origin CDN routing with TLS termination at the edge, HTTP-only origin connections, origin verification headers, and cache policies differentiating immutable static assets from ISR-revalidated dynamic content. Implemented multi-tier WAF (OWASP Top 10, IP reputation, rate limiting) at both edge and regional layers, IAM least-privilege with three scoped roles (instance, task execution, task), and SSM-based cross-stack service discovery replacing tight CloudFormation export coupling. Deployed sidecar containers for log forwarding (Promtail → Loki) and trace collection (Alloy → Tempo via gRPC/OTLP), plus a DynamoDB single-table design with GSI access patterns and serverless API (Lambda, API Gateway) with OIDC-authenticated GitHub Actions CI/CD pipeline, JSON schema request validation, per-function dead letter queues, and cross-region DNS validation for certificate provisioning.',
      github: 'github.com/Nelson-Lamounier/cdk-monitoring',
    },
  ],
}
