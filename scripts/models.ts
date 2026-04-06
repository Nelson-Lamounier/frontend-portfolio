import {
  SFNClient,
  ListStateMachinesCommand,
  DescribeStateMachineCommand,
} from "@aws-sdk/client-sfn";
import { BedrockClient, ListFoundationModelsCommand } from "@aws-sdk/client-bedrock";
import { fromIni } from "@aws-sdk/credential-providers";

/**
 * Recursively extracts Bedrock model ARNs or IDs from a JSON object.
 * Looks for Task states invoking bedrock and extracts the ModelId from Parameters.
 * Also scans all strings for any hardcoded Bedrock ARNs.
 */
function extractBedrockModels(obj: any): string[] {
  const models = new Set<string>();

  function traverse(node: any) {
    if (!node || typeof node !== "object") return;
    
    // Check if node is a state that integrates with Bedrock
    if (
      node.Type === "Task" &&
      typeof node.Resource === "string" &&
      node.Resource.includes("bedrock:invokeModel")
    ) {
      if (node.Parameters && node.Parameters.ModelId) {
        models.add(node.Parameters.ModelId);
      }
    }

    // Traverse all keys for any hardcoded ARNs
    for (const key of Object.keys(node)) {
      if (typeof node[key] === "string") {
        if (node[key].startsWith("arn:aws:bedrock:") && node[key].includes("foundation-model")) {
            models.add(node[key]);
        }
      } else {
        traverse(node[key]);
      }
    }
  }

  traverse(obj);
  return Array.from(models);
}

async function main() {
  const credentials = fromIni({ profile: "dev-account" });
  const region = "eu-west-1";

  // 1. Fetch Bedrock Foundation Models
  const bedrockClient = new BedrockClient({ region, credentials });
  console.log("Fetching AWS Bedrock Foundation Models...");
  try {
    const listModelsRes = await bedrockClient.send(new ListFoundationModelsCommand({}));
    if (listModelsRes.modelSummaries) {
      console.log(`\nFound ${listModelsRes.modelSummaries.length} Foundation Models in ${region}:\n`);
      listModelsRes.modelSummaries.forEach((m) => {
        console.log(`- ${m.modelId}`);
        console.log(`  ARN: ${m.modelArn}`);
      });
      console.log(`\n===========================================`);
    }
  } catch (err) {
    console.error("Failed to list Bedrock Foundation Models:", err);
  }

  // 2. Fetch Step Functions State Machines
  const sfnClient = new SFNClient({ region, credentials });

  console.log("\nFetching Step Functions State Machines...");
  
  let nextToken: string | undefined;
  let matchesCount = 0;
  
  const allStateMachines = [];

  do {
    const listRes = await sfnClient.send(
      new ListStateMachinesCommand({ nextToken })
    );
    if (listRes.stateMachines) {
      allStateMachines.push(...listRes.stateMachines);
    }
    nextToken = listRes.nextToken;
  } while (nextToken);

  console.log(`\nFound ${allStateMachines.length} State Machine(s):`);
  allStateMachines.forEach((sm, index) => {
    console.log(`  ${index + 1}. [${sm.name}] ${sm.stateMachineArn}`);
  });

  console.log("\nChecking definitions for Bedrock Models...");

  for (const sm of allStateMachines) {
    try {
      const describeRes = await sfnClient.send(
        new DescribeStateMachineCommand({ stateMachineArn: sm.stateMachineArn })
      );

      if (describeRes.definition) {
        const definition = JSON.parse(describeRes.definition);
        const models = extractBedrockModels(definition);
        
        if (models.length > 0) {
          console.log(`\n===========================================`);
          console.log(`State Machine: ${sm.name}`);
          console.log(`ARN: ${sm.stateMachineArn}`);
          console.log(`Bedrock Models used:`);
          models.forEach((m) => console.log(`  - ${m}`));
          console.log(`===========================================`);
          matchesCount++;
        }
      }
    } catch (err) {
      console.error(`Failed to describe state machine ${sm.name}:`, err);
    }
  }

  if (matchesCount === 0) {
    console.log("\nNo Step Functions using Bedrock models were found.");
  } else {
    console.log(`\nFound ${matchesCount} Step Function(s) using Bedrock models.`);
  }
}

main().catch(console.error);
