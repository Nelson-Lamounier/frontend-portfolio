/**
 * Tailored resume data for AWS ESC Systems Engineer / DevOps Eng role.
 *
 * Every bullet point maps to real experience already documented in
 * the main resume-data.ts. Content is reframed and keyword-aligned
 * for the Systems Engineer / DevOps Eng, ESC Managed Operations
 * position. Nothing fabricated.
 */

import type { ResumeData } from './resume-data'

export const resumeDataEsc: ResumeData = {
  profile: {
    name: 'Nelson Lamounier Leao',
    title: 'Cloud & DevOps Engineer | AWS Certified DevOps Professional',
    location: 'Dublin, Ireland',
    email: 'lamounierleao@outlook.com',
    linkedin: 'linkedin.com/in/nelson-lamounier-leao',
    github: 'github.com/Nelson-Lamounier',
    website: 'nelsonlamounier.com',
  },

  summary:
    'AWS Certified DevOps Engineer Professional supporting AWS customers on high-availability workloads across EC2, VPC, IAM, S3, DynamoDB, Lambda, and CloudWatch. Day-to-day work involves incident root-cause analysis through CloudTrail API logs, log correlation across services, and debugging IAM permission boundaries. Built and operate a self-managed Kubernetes cluster on AWS (kubeadm, Calico CNI, Traefik) with a full LGTM observability stack (Prometheus, Grafana, Loki, Tempo) deployed via custom Helm charts and ArgoCD GitOps. Multi-stack IaC platform (AWS CDK, TypeScript) with CI/CD pipelines, policy-as-code scanning (CDK-nag, Checkov), and infrastructure drift detection. Comfortable with Linux administration (systemd, Bash, SSH, file permissions) and networking fundamentals (TCP/IP, DNS, TLS, VPC routing, Calico NetworkPolicy). Author operational runbooks and architecture decision records.',

  keyAchievements: [
    {
      achievement:
        'Built and operate a self-managed Kubernetes cluster on AWS (kubeadm, Calico CNI, Traefik ingress) with a custom Helm chart deploying 11 monitoring services (Prometheus, Grafana, Loki, Tempo, Alloy/Faro) via ArgoCD GitOps',
    },
    {
      achievement:
        'Triaged security incidents at AWS involving compromised IAM access keys, analysing CloudTrail API activity, coordinating credential rotation procedures, and debugging permission boundaries and cross-account role assumptions',
    },
    {
      achievement:
        'Architected a multi-stack IaC platform (AWS CDK, TypeScript) with domain-aligned stacks, SSM-based cross-stack service discovery, and Step Functions orchestrating node bootstrap automation',
    },
    {
      achievement:
        'Built CI/CD pipelines (GitHub Actions, OIDC) with policy-as-code scanning (CDK-nag, Checkov), infrastructure drift detection, integration testing, and automated rollback on failure',
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
      title: 'Cloud & DevOps Engineer',
      period: '2022 – Present (Part-time)',
      highlights: [
        'Built and operate a self-managed Kubernetes cluster on AWS using kubeadm, Calico CNI, and Traefik ingress controller. Nodes bootstrapped via Step Functions orchestrating SSM Automation documents with Golden AMI pipeline',
        'Deployed a full LGTM observability stack (Prometheus, Grafana, Loki, Tempo, Alloy/Faro) via a custom Helm chart with ArgoCD GitOps. Configured Kubernetes service discovery, Tempo span-metric generation with remote write to Prometheus, and Grafana unified alerting to SNS',
        'Designed multi-stack IaC architectures in AWS CDK (TypeScript). Separated stacks by operational domain (compute, networking, storage, edge, AI) with SSM parameter-based cross-stack discovery. Policy-as-code scanning with CDK-nag (AwsSolutions pack) and Checkov',
        'Built CI/CD pipelines (GitHub Actions, OIDC auth) with infrastructure drift detection, integration testing against live AWS resources, and automated rollback on failure. ArgoCD Image Updater automates container deployments via Git writeback',
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
      category: 'Kubernetes & GitOps',
      skills: [
        'Self-managed Kubernetes (kubeadm, kubelet, etcd)',
        'ArgoCD (ApplicationSet, Image Updater, Git writeback)',
        'Helm Chart Authoring (custom charts, values overrides)',
        'Calico CNI, NetworkPolicy, Traefik IngressRoutes',
        'Pod Security, ResourceQuota, PodDisruptionBudget',
      ],
    },
    {
      category: 'Systems Engineering & Linux',
      skills: [
        'Linux Administration (Bash, systemd, chmod/chown, SSH, process management)',
        'TCP/IP, DNS, HTTP/HTTPS, gRPC, TLS',
        'VPC, Subnets, Security Groups, ENI, Route Tables',
        'Container Runtime (Docker, containerd)',
        'EC2 Instance Management, Launch Templates, Auto Scaling',
      ],
    },
    {
      category: 'AWS Cloud Services',
      skills: [
        'EC2, S3, DynamoDB, Lambda, VPC, IAM',
        'CloudWatch, CloudTrail, Trusted Advisor, Security Hub, GuardDuty',
        'CloudFront, Route 53, ACM, WAF, KMS, SSM',
        'Step Functions, NLB, Auto Scaling Groups',
        'API Gateway, SES, ECR, Cognito, Bedrock',
      ],
    },
    {
      category: 'Monitoring & Observability',
      skills: [
        'Prometheus (native scrape_configs, Kubernetes SD)',
        'Grafana (dashboards, unified alerting, federated datasources)',
        'Loki (log aggregation), Tempo (distributed tracing)',
        'Alloy/Faro (Real User Monitoring), OpenTelemetry (OTLP)',
        'AWS CloudWatch, Steampipe (cloud inventory SQL)',
      ],
    },
    {
      category: 'Infrastructure as Code & Automation',
      skills: [
        'AWS CDK (TypeScript), CloudFormation',
        'GitHub Actions (Reusable Workflows, OIDC Authentication)',
        'Policy-as-Code (CDK-nag AwsSolutions, Checkov)',
        'Step Functions Orchestration, SSM Automation',
        'Infrastructure Drift Detection, Integration Testing',
      ],
    },
    {
      category: 'Security & Incident Response',
      skills: [
        'IAM Policies, Permission Boundaries, Trust Relationships',
        'Credential Rotation, MFA Enforcement',
        'CloudTrail API Activity Analysis',
        'Kubernetes NetworkPolicy, Container Security Contexts',
        'WAF Rule Management (OWASP Top 10, Rate Limiting)',
      ],
    },
    {
      category: 'Languages & Scripting',
      skills: [
        'TypeScript, Python, Bash, SQL',
        'YAML / Helm Templating',
        'AWS CLI & SDKs',
        'Node.js (Next.js, CDK)',
        'Git, GitHub',
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
      name: 'Self-Managed Kubernetes Platform with LGTM Observability',
      description:
        'Self-managed Kubernetes cluster on AWS (kubeadm, Calico CNI, Traefik) with a custom Helm chart deploying 11 monitoring services via ArgoCD GitOps. Full LGTM stack: Prometheus (native scrape_configs, 12 jobs), Grafana (13 dashboards, unified alerting to SNS), Loki (TSDB, 7d retention), Tempo (span-metric generation with Prometheus remote write), and Alloy/Faro for browser RUM. Dedicated monitoring node with ResourceQuota and NetworkPolicy enforcement. Step Functions orchestrating SSM-based node bootstrap with Golden AMI pipeline.',
      github: 'github.com/Nelson-Lamounier/cdk-monitoring/tree/main/kubernetes-app',
    },
    {
      name: 'Multi-Stack AWS CDK Infrastructure Platform',
      description:
        'Production-grade IaC platform (AWS CDK, TypeScript) with domain-aligned stacks across compute, networking, edge, AI, and observability layers. Multi-origin CloudFront CDN with WAF (OWASP Top 10, rate limiting), NLB with ACM TLS termination, and SSM-based cross-stack service discovery. CI/CD via GitHub Actions with OIDC auth, CDK-nag and Checkov policy-as-code scanning, integration testing against live resources, and automated rollback. Includes Bedrock AI agent for infrastructure self-healing and a serverless API (Lambda, API Gateway, DynamoDB).',
      github: 'github.com/Nelson-Lamounier/cdk-monitoring/tree/main/infra',
    },
  ],
}
