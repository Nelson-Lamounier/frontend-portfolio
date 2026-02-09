#!/usr/bin/env tsx
/**
 * ECS Task Update Script
 *
 * Triggers ECS service update with force-new-deployment.
 * Uses SSM Parameter Store to discover cluster/service names.
 *
 * Auth modes:
 *   - CI/Pipeline: Uses OIDC (credentials from env vars, no --profile needed)
 *   - Local/Manual: Uses AWS CLI profile (--profile flag)
 *
 * Usage:
 *   Local:    npx tsx scripts/update-ecs-task.ts --env dev --profile dev-account
 *   Pipeline: npx tsx scripts/update-ecs-task.ts --env development --wait --timeout 10
 */

import {
  ECSClient,
  UpdateServiceCommand,
  DescribeServicesCommand,
} from '@aws-sdk/client-ecs'
import * as log from './lib/logger.js'
import {
  parseArgs,
  buildAwsConfig,
  getAccountId,
  getSSMParameter,
  resolveAuth,
  type AwsConfig,
} from './lib/aws-helpers.js'

// ========================================
// CLI Arguments
// ========================================

const args = parseArgs(
  [
    { name: 'env', description: 'Environment: dev, staging, prod', hasValue: true, default: 'dev' },
    { name: 'profile', description: 'AWS CLI profile', hasValue: true },
    { name: 'region', description: 'AWS region', hasValue: true, default: 'eu-west-1' },
    { name: 'wait', description: 'Wait for service stability after deployment', hasValue: false, default: false },
    { name: 'timeout', description: 'Stability timeout in minutes (used with --wait)', hasValue: true, default: '10' },
  ],
  'Trigger ECS service update (force-new-deployment)',
)

// ========================================
// Main
// ========================================

async function main(): Promise<void> {
  const config = buildAwsConfig(args)
  const auth = resolveAuth(config.profile)
  const waitForStability = args.wait as boolean
  const stabilityTimeout = parseInt(args.timeout as string, 10)

  log.header('🔄 ECS Task Update Script')
  log.config('Configuration', {
    'Auth Mode': auth.mode,
    'AWS Region': config.region,
    'Environment': config.environment,
  })

  // Step 1: Verify AWS credentials
  log.step(1, 3, 'Verifying AWS credentials...')
  const accountId = await getAccountId(config)
  log.success(`Account ID: ${accountId}`)

  // Step 2: Discover ECS cluster/service from SSM
  log.step(2, 3, 'Discovering ECS configuration from SSM...')

  const clusterParam = `/nextjs/${config.environment}/ecs/cluster-name`
  const serviceParam = `/nextjs/${config.environment}/ecs/service-name`

  console.log(`   Looking up: ${clusterParam}`)
  const clusterName = await getSSMParameter(clusterParam, config)
  if (!clusterName) {
    log.fatal(
      `Failed to get ECS cluster name from SSM parameter: ${clusterParam}\n` +
      '   Ensure the SSM parameter exists in the target environment.\n' +
      '   This parameter is created when the ECS service is deployed via CDK.',
    )
  }
  log.success(`Cluster: ${clusterName}`)

  console.log(`   Looking up: ${serviceParam}`)
  const serviceName = await getSSMParameter(serviceParam, config)
  if (!serviceName) {
    log.fatal(
      `Failed to get ECS service name from SSM parameter: ${serviceParam}\n` +
      '   Ensure the SSM parameter exists in the target environment.\n' +
      '   This parameter is created when the ECS service is deployed via CDK.',
    )
  }
  log.success(`Service: ${serviceName}`)

  // Step 3: Force new deployment
  log.step(3, 3, 'Triggering ECS service update...')
  console.log(`   Cluster: ${clusterName}`)
  console.log(`   Service: ${serviceName}`)

  const ecs = new ECSClient({
    region: config.region,
    credentials: config.credentials,
  })

  await ecs.send(
    new UpdateServiceCommand({
      cluster: clusterName,
      service: serviceName,
      forceNewDeployment: true,
    }),
  )

  log.success('ECS service update triggered')

  // Optional: Wait for stability
  if (waitForStability) {
    console.log('')
    console.log(
      log.yellow(`⏳ Waiting for service to stabilize (timeout: ${stabilityTimeout} minutes)...`),
    )

    const deadline = Date.now() + stabilityTimeout * 60 * 1000
    let stable = false

    while (Date.now() < deadline) {
      const desc = await ecs.send(
        new DescribeServicesCommand({
          cluster: clusterName,
          services: [serviceName],
        }),
      )

      const service = desc.services?.[0]
      if (service) {
        const deployments = service.deployments || []
        const primary = deployments.find((d) => d.status === 'PRIMARY')

        if (
          primary &&
          primary.runningCount === primary.desiredCount &&
          deployments.length === 1
        ) {
          stable = true
          break
        }
      }

      // Poll every 15 seconds
      await new Promise((resolve) => setTimeout(resolve, 15000))
    }

    if (stable) {
      log.success('Service is stable')
    } else {
      log.fatal('Service did not stabilize within timeout')
    }
  }

  log.summary('Task Update Initiated!', {
    'ECS Cluster': clusterName,
    'ECS Service': serviceName,
  })

  log.nextSteps([
    `Monitor: aws ecs describe-services --cluster ${clusterName} --services ${serviceName} --query 'services[0].deployments'`,
  ])
}

main().catch((error) => {
  log.fatal(`ECS update failed: ${error.message}`)
})
