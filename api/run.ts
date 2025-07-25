import { fileURLToPath } from "url";
import path from "path";
import { runGraphInFile, NodeDatasetProvider, RunGraphOptions } from "@ironclad/rivet-node";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ALLOWED_ORIGINS = [
  "https://crisis-comms.vercel.app",
  "http://localhost:3000",
  "http://localhost:4015",
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log("🚀 /api/run triggered");
  console.log("📦 Headers:", JSON.stringify(req.headers, null, 2));

  const origin = req.headers.origin || "";
  console.log("🌍 Request origin:", origin);

  const isAllowed = ALLOWED_ORIGINS.includes(origin);
  console.log("✅ Is allowed origin:", isAllowed);

  if (isAllowed) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }

  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    console.log("🔄 OPTIONS preflight request handled.");
    return res.status(200).end();
  }

  const token = req.headers.authorization?.replace("Bearer ", "");
  const expectedToken = process.env.AUTH_TOKEN;

  console.log("🔐 Received token:", token);
  console.log("🎯 Expected token:", expectedToken);

  if (!expectedToken || token !== expectedToken) {
    console.warn("🚫 Forbidden request: invalid or missing token.");
    return res.status(403).json({ error: "Forbidden: Invalid or missing token." });
  }

  console.log("✅ Bearer token matched. Proceeding...");

  try {
    const body = req.body;
    console.log("📨 Full request body:", JSON.stringify(body, null, 2));

    const { graph, inputs } = body;

    if (!graph || !inputs) {
      console.error("❌ Missing graph or input string");
      return res.status(400).json({ error: "Missing graph or input string" });
    }

    console.log("📂 Graph ID to run:", graph);
    console.log("📥 inputs.stringGraph:", inputs.stringGraph);

    const openAiKey = process.env.OPEN_AI_KEY;
    if (!openAiKey) {
      console.error("❌ Missing OPEN_AI_KEY env variable.");
      return res.status(500).json({ error: "Missing OPEN_AI_KEY" });
    }

    const projectFiles = ["Master.rivet-project", "Campaign-alignment.rivet-project"];
    let result = null;
    let matched = false;

    for (const file of projectFiles) {
      const projectPath = path.resolve(__dirname, "data", file);
      console.log(`📁 Checking project file: ${file}`);

      const datasetProvider = await NodeDatasetProvider.fromProjectFile(projectPath, { save: false });
      


const graphsMap = (datasetProvider as any).project?.graphs;

if (graphsMap && typeof graphsMap === "object") {
  const graphList = Object.values(graphsMap).map((g: any) => {
    const label = g?.metadata?.label ?? "(Unnamed)";
    const id = g?.id ?? "(No ID)";
    return `${label} (${id})`;
  });

  console.log(`📊 Graphs in ${file}:`, graphList);
} else {
  console.warn(`⚠️ No graphs found in ${file}`);
}


      

      try {
        result = await runGraphInFile(projectPath, {
          graph,
          remoteDebugger: undefined,
          inputs,
          context: {},
          externalFunctions: {},
          onUserEvent: {},
          openAiKey,
          datasetProvider,
        } as RunGraphOptions);

        matched = true;
        console.log(`✅ Found and executed graph in file: ${file}`);
        break;
      } catch (err: any) {
        console.warn(`❌ Could not run graph in ${file}: ${err.message}`);
        continue;
      }
    }

    if (matched && result) {
      res.status(200).json({
        message: "Graph executed successfully.",
        prompt: inputs.stringGraph,
        outputs: result || {},
        partialOutputs: result.partialOutputs || {},
        errors: result.errors || [],
      });
    } else {
      res.status(404).json({
        error: "Graph not found in any project file.",
      });
    }
  } catch (err: any) {
    console.error("❌ Exception during graph execution:", err);
    res.status(500).json({
      error: err.message || "Unknown error occurred.",
      stack: err.stack || "",
    });
  }
}