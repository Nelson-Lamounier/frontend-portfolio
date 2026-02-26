import { Card } from '@/components/Card'
import { Section } from '@/components/Section'
import { SimpleLayout } from '@/components/SimpleLayout'

function ToolsSection({
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof Section>) {
  return (
    <Section {...props}>
      <ul role="list" className="space-y-16">
        {children}
      </ul>
    </Section>
  )
}

function Tool({
  title,
  href,
  children,
}: {
  title: string
  href?: string
  children: React.ReactNode
}) {
  return (
    <Card as="li">
      <Card.Title as="h3" href={href}>
        {title}
      </Card.Title>
      <Card.Description>{children}</Card.Description>
    </Card>
  )
}

export const metadata = {
  title: "Nelson's Setup | AWS Tools, Hardware & VS Code",
  description:
    'The workstation, editor, CLI tools, and deployment stack I use daily to build and operate AWS infrastructure with CDK.',
}

export default function Uses() {
  return (
    <SimpleLayout
      title="What I Use"
      intro="The hardware, editor setup, and CLI tools I rely on to build and deploy AWS infrastructure. Nothing here is aspirational — it's all stuff I use daily."
    >
      <div className="space-y-20">
        <ToolsSection title="Workstation">
          <Tool title='MacBook Pro 14", M3 Pro, 36GB RAM (2024)'>
            Moved from Intel to Apple Silicon in 2024. Docker multi-arch builds
            are noticeably faster, and the ARM architecture gives better parity
            with AWS Graviton instances. 36GB handles CDK synth, Docker builds,
            and local container stacks without swapping.
          </Tool>
          <Tool title='LG 34" UltraWide 5K2K Monitor'>
            I keep a terminal, VS Code, and the AWS console open side by side.
            The 21:9 aspect ratio means I rarely switch windows during a
            deployment or debugging session.
          </Tool>
        </ToolsSection>
        <ToolsSection title="Development tools">
          <Tool title="Visual Studio Code">
            My main editor. I run the AWS Toolkit, CDK snippets, and Docker
            extensions. The integrated terminal means I can run cdk deploy and
            check container logs without leaving the editor.
          </Tool>
          <Tool title="AWS CLI v2 + Session Manager Plugin">
            Named profiles for dev, staging, and production. Session Manager
            replaces SSH for instance access — no open ports, no key
            management.
          </Tool>
          <Tool title="Kiro (AWS AI-powered IDE)">
            I&apos;m experimenting with Kiro for CDK generation. It requires careful
            review — I caught it creating unnecessary VPC Interface Endpoints
            that would have added $14/month per AZ. AI-generated infrastructure
            can be syntactically correct but financially expensive.
          </Tool>
        </ToolsSection>
        <ToolsSection title="Infrastructure & Deployment">
          <Tool title="AWS CDK (TypeScript)">
            I write all my infrastructure in CDK. After working directly with
            CloudFormation JSON/YAML, having type-checked constructs and
            refactoring support made a real difference.
          </Tool>
          <Tool title="Docker Desktop">
            I build and test container images locally before pushing to ECR.
            The M3 compatibility improvements have made multi-arch builds
            more reliable.
          </Tool>
          <Tool title="GitHub Actions">
            My CI/CD platform. OIDC integration with AWS means no stored
            credentials. I run 19 workflow files that handle synthesis,
            security scanning, deployment, and rollback.
          </Tool>
          <Tool title="AWS CloudFormation">
            I&apos;m CDK-first, but I still read and debug CloudFormation
            templates regularly. Understanding the output that CDK generates
            has helped me fix synthesis issues faster.
          </Tool>
        </ToolsSection>
        <ToolsSection title="Monitoring & Debugging">
          <Tool title="CloudWatch Logs Insights">
            I use this more than I expected. The query syntax takes a bit to
            learn, but once you know it, filtering through distributed logs
            gets fast.
          </Tool>
          <Tool title="Grafana + Prometheus + Loki">
            I run a self-hosted observability stack on EC2 with 9 dashboards,
            4 datasources, and cross-signal correlation. Clicking a trace span
            jumps to the matching log entries and metrics panel — that workflow
            has cut my debugging time significantly.
          </Tool>
        </ToolsSection>
      </div>
    </SimpleLayout>
  )
}
