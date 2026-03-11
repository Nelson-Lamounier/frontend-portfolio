/**
 * Tailored resume data — AWS ESC Systems Engineer / DevOps Eng role.
 *
 * Every bullet point maps to real experience already documented in
 * the main resume-data.ts. Content is reframed and keyword-aligned
 * for the Systems Engineer / DevOps Eng, ESC Managed Operations
 * position — nothing fabricated.
 */

import type { ResumeData } from './resume-data'

export const resumeDataEsc: ResumeData = {
  profile: {
    name: 'Nelson Lamounier',
    title: 'AWS Certified Systems Engineer & DevOps Professional',
    location: 'Dublin, Ireland',
    email: 'lamounierleao@outlook.com',
    linkedin: 'linkedin.com/in/nelson-lamounier-leao',
    github: 'github.com/Nelson-Lamounier',
    website: 'nelsonlamounier.com',
  },

  summary:
    'AWS Certified DevOps Engineer — Professional who has spent the last three years supporting AWS customers on high-availability workloads across EC2, ECS, VPC, IAM, S3, DynamoDB, Lambda, and CloudWatch. Day-to-day work involves incident root-cause analysis through CloudTrail API logs, log correlation across services, and debugging IAM permission boundaries. Built and operate a self-hosted monitoring platform (Prometheus, Grafana, Loki, Tempo) and multi-stack IaC architectures (AWS CDK, CloudFormation) outside of work. Comfortable in Linux (systemd, Bash, SSH, file permissions) and familiar with networking fundamentals (TCP/IP, DNS, TLS, VPC routing). Write and improve operational procedures regularly, and work closely with Support Engineers and service teams on escalations.',

  keyAchievements: [
    {
      achievement:
        'Deployed and operated a self-hosted observability platform (Prometheus, Grafana, Loki, Tempo) as a 7-container stack with DNS-based service discovery, automated health verification, and infrastructure rollback on failure',
    },
    {
      achievement:
        'Triaged security incidents at AWS involving compromised IAM access keys — analysing CloudTrail API activity, coordinating credential rotation procedures, and debugging permission boundaries and cross-account role assumptions',
    },
    {
      achievement:
        'Architected a 6-stack IaC platform (AWS CDK, TypeScript), consolidating 14+ legacy CloudFormation stacks into domain-aligned infrastructure with SSM-based cross-stack service discovery',
    },
    {
      achievement:
        'Built CI/CD pipelines with automated rollback strategies, policy-as-code scanning (Checkov), infrastructure drift detection, and smoke tests validating container health, HTTP endpoints, and datasource connectivity',
    },
  ],

  experience: [
    {
      company: 'Amazon Web Services (AWS)',
      title: 'Technical Customer Service Associate',
      period: '2022 – Present',
      highlights: [
        'When customers reported compromised IAM access keys, analysed CloudTrail API activity for unauthorised resource creation, coordinated credential rotation, enforced MFA, and debugged IAM policy documents, trust relationships, permission boundaries, and cross-account role assumptions until access was restored',
        'Investigated ECS and Lambda deployment failures end-to-end: task definitions, IAM execution role permissions, ECR image pull auth, VPC networking, security group rules, container health checks, and service event logs. Root-caused issues spanning compute, networking, and IAM layers',
        'Used CloudWatch metrics, CloudTrail API logs, Cost Explorer, and Trusted Advisor to spot infrastructure anomalies: unattached EBS volumes, idle Elastic IPs, data transfer spikes, misconfigured Auto Scaling policies, and oversized instances. Wrote up remediation recommendations for each case',
        'Debugged issues that cut across multiple AWS services (CloudFront, Security Hub, KMS key policies, OpenSearch, SES) using AWS CLI and Console. Correlated logs at the resource level to pin down root causes',
        'Worked directly with AWS Support Engineers on escalations. Documented findings across security groups, IAM permission boundaries, VPC routing, and ECS task definitions to speed up resolution',
      ],
    },
    {
      company: 'Freelance',
      title: 'Systems & DevOps Engineer',
      period: '2022 – Present (Part-time)',
      highlights: [
        'Designed multi-stack IaC architectures in AWS CDK (TypeScript) and CloudFormation. Separated stacks by operational domain and wired them together with SSM parameter discovery instead of tight CloudFormation exports across compute, networking, storage, and edge layers',
        'Run a self-hosted monitoring platform (Prometheus, Grafana, Loki, Tempo) on EC2 with Docker Compose. Set up HTTP/TCP scrape endpoints, gRPC trace ingestion, DNS-based service discovery via Cloud Map, Linux file permissions (chmod/chown), and persistent volumes that survive instance replacements',
        'Built CI/CD pipelines with operational safeguards: OIDC auth (no static credentials), Checkov policy-as-code scanning, CloudFormation validation, drift detection, automated smoke tests, and rollback-on-failure. Pipelines run across staging and production environments',
        'Locked down ECS containers: non-root execution (UID 1001), dropped all Linux capabilities, tini init process, awsvpc network mode with per-task security groups, and sidecar containers for log forwarding (Promtail) and trace collection (Alloy via gRPC)',
      ],
    },
    {
      company: 'Meta via Accenture',
      title: 'Quality Assurance Analyst',
      period: '2021 – 2022',
      highlights: [
        'Configured and troubleshot enterprise platform deployments on Meta\'s ad infrastructure. Worked on campaign delivery reliability and tracked performance metrics across distributed systems',
        'Wrote standardised operational procedures and reusable configuration templates. These cut resolution times for recurring platform issues and made onboarding faster for new team members',
        'Built SQL-based monitoring dashboards and correlation queries for platform health. Used them to spot anomalies before they became incidents',
        'Worked across engineering and operations teams to find process bottlenecks, reduce escalation turnaround, and simplify operational workflows',
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
      category: 'Systems Engineering & Linux',
      skills: [
        'Linux Administration (Bash, systemd, chmod/chown, SSH, process management)',
        'TCP/IP, DNS, HTTP/HTTPS, gRPC, TLS',
        'VPC, Subnets, Security Groups, ENI, Route Tables',
        'Container Runtime Operations (Docker, Docker Compose, ECS)',
        'EC2 Instance Management, Launch Templates, Auto Scaling',
      ],
    },
    {
      category: 'AWS Cloud Services',
      skills: [
        'EC2, ECS, S3, DynamoDB, Lambda, VPC, IAM',
        'CloudWatch, CloudTrail, Trusted Advisor, Security Hub',
        'CloudFront, Route 53, ACM, WAF, KMS, SSM',
        'Auto Scaling, Application Load Balancing (ALB)',
        'API Gateway, SES, ECR',
      ],
    },
    {
      category: 'Monitoring & Observability',
      skills: [
        'Prometheus, Grafana, Loki, Tempo',
        'AWS CloudWatch, X-Ray',
        'OpenTelemetry (OTLP)',
        'Log Aggregation, Distributed Tracing',
        'DNS-based Service Discovery (Cloud Map)',
      ],
    },
    {
      category: 'Infrastructure as Code & Automation',
      skills: [
        'AWS CDK (TypeScript), CloudFormation',
        'GitHub Actions (Reusable Workflows, OIDC Authentication)',
        'Policy-as-Code (Checkov, CDK-Nag)',
        'Infrastructure Drift Detection',
        'Automated Smoke Testing, Rollback Strategies',
      ],
    },
    {
      category: 'Security & Incident Response',
      skills: [
        'IAM Policies, Permission Boundaries, Trust Relationships',
        'Credential Rotation, MFA Enforcement',
        'CloudTrail API Activity Analysis',
        'Container Hardening (Non-root, CAP_DROP, Init Process)',
        'WAF Rule Management (OWASP Top 10, Rate Limiting)',
      ],
    },
    {
      category: 'Languages & Scripting',
      skills: [
        'Bash, Python, TypeScript, SQL',
        'AWS CLI & SDKs',
        'Git, GitHub',
        'Node.js',
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
        'Designed and deployed a production-grade containerised application platform using a 6-stack IaC architecture (AWS CDK, TypeScript) organised by operational domains — Data, Compute, Networking, Application, API, and Edge — consolidated from 14+ legacy stacks. Hardened container security with non-root user execution (UID 1001), dropped all Linux capabilities (CAP_DROP ALL), init process (tini) for zombie process reaping, tmpfs mounts for ephemeral cache, and NOFILE ulimits (65536). Configured awsvpc networking with per-task ENI isolation, TCP/HTTP health checks on port 3000, and security group rules restricting ingress to load balancer and monitoring sources only. Built multi-origin CDN routing with TLS termination at the edge, origin verification headers, and cache policies differentiating immutable static assets from dynamically revalidated content. Implemented multi-tier WAF (OWASP Top 10, IP reputation, rate limiting) at both edge and regional layers, IAM least-privilege with three scoped roles (instance, task execution, task), and SSM-based cross-stack service discovery replacing tight CloudFormation export coupling. Deployed sidecar containers for log forwarding (Promtail → Loki) and trace collection (Alloy → Tempo via gRPC/OTLP), plus DynamoDB single-table design with GSI access patterns and serverless API (Lambda, API Gateway) with OIDC-authenticated CI/CD pipeline.',
      github: 'github.com/Nelson-Lamounier/cdk-monitoring',
    },
  ],
}
