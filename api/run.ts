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






if (req.method === "OPTIONS") {
  if (isAllowed) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Vary", "Origin");

  console.log(isAllowed ? "🔄 OPTIONS preflight accepted." : "🚫 OPTIONS preflight blocked.");
  return res.status(isAllowed ? 200 : 403).end();
}

if (isAllowed) {
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
} else {
  console.warn("🚫 Origin not allowed:", origin);
  return res.status(403).json({ error: "Forbidden: origin not allowed" });
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

    const project = path.resolve(__dirname, "data", "Master.rivet-project");
    console.log("📁 Loading project file from:", project);

    const datasetProvider = await NodeDatasetProvider.fromProjectFile(project, { save: false });

    const result = await runGraphInFile(project, {
      graph,
      remoteDebugger: undefined,
      inputs,
      context: {},
      externalFunctions: {},
      onUserEvent: {},
      openAiKey,
      datasetProvider,
    } as RunGraphOptions);


    console.log("✅ Graph executed successfully.");
    console.log("🟢 Outputs:", result || {});
    console.log("🟡 Partial outputs:", result.partialOutputs || {});
    if (result.errors) {
      console.warn("⚠️ Graph node-level errors:", result.errors);
    }

    res.status(200).json({
      message: "Graph executed successfully.",
      prompt: inputs.stringGraph,
      outputs: result || {},
      partialOutputs: result.partialOutputs || {},
      errors: result.errors || [],
    });
  } catch (err: any) {
    console.error("❌ Exception during graph execution:", err);
    res.status(500).json({
      error: err.message || "Unknown error occurred.",
      stack: err.stack || "",
    });
  }
}