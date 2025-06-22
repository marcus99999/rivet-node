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

const logs: string[] = [];
const log = (msg: string) => {
  logs.push(msg);
  console.log(msg);
};
const error = (msg: string) => {
  const errMsg = `❌ ${msg}`;
  logs.push(errMsg);
  console.error(errMsg);
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  log("🚀 /api/run triggered");
  log("📦 Headers:\n" + JSON.stringify(req.headers, null, 2));

  const origin = req.headers.origin || "";
  log(`🌍 Request origin: ${origin}`);

  const isAllowed = ALLOWED_ORIGINS.includes(origin);
  log(`✅ Is allowed origin: ${isAllowed}`);

  if (isAllowed) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }

  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    log("🔄 OPTIONS preflight request handled.");
    return res.status(200).end();
  }

  const token = req.headers.authorization?.replace("Bearer ", "");
  const expectedToken = process.env.AUTH_TOKEN;

  log(`🔐 Received token: ${token}`);
  log(`🎯 Expected token: ${expectedToken}`);

  if (!expectedToken || token !== expectedToken) {
    error("Forbidden request: invalid or missing token.");
    return res.status(403).json({ error: "Forbidden: Invalid or missing token." });
  }

  try {
    const { graph, inputs } = req.body;

    if (!graph || !inputs) {
      error("Missing graph or input string.");
      return res.status(400).json({ error: "Missing graph or input string." });
    }

    log(`📂 Graph ID to run: ${graph}`);
    log("📥 Raw inputs:\n" + (typeof inputs === "string" ? inputs : JSON.stringify(inputs, null, 2)));

    let parsedInputs;
    try {
      parsedInputs = typeof inputs === "string" ? JSON.parse(inputs) : inputs;
    } catch (e) {
      error("Invalid JSON in inputs.");
      return res.status(400).json({
        error: "Invalid JSON in inputs",
        details: (e as Error).message,
        logs,
      });
    }

    const openAiKey = process.env.OPEN_AI_KEY;
    if (!openAiKey) {
      error("Missing OPEN_AI_KEY env variable.");
      return res.status(500).json({ error: "Missing OPEN_AI_KEY", logs });
    }

    const project = path.resolve(__dirname, "data", "Master.rivet-project");
    log(`📁 Loading project file from: ${project}`);

    const datasetProvider = await NodeDatasetProvider.fromProjectFile(project, { save: false });

    const result = await runGraphInFile(project, {
      graph,
      remoteDebugger: undefined,
      inputs: { input: parsedInputs },
      context: {},
      externalFunctions: {},
      onUserEvent: {},
      openAiKey,
      datasetProvider,
    } as RunGraphOptions);

    log("✅ Graph executed successfully.");
    log("🟢 Outputs:\n" + JSON.stringify(result.outputs || {}, null, 2));
    if (result.partialOutputs) {
      log("🟡 Partial Outputs:\n" + JSON.stringify(result.partialOutputs, null, 2));
    }
    if (result.errors?.length) {
      error("Graph node-level errors:\n" + JSON.stringify(result.errors, null, 2));
    }

    return res.status(200).json({
      message: "Graph executed successfully.",
      prompt: parsedInputs,
      outputs: result.outputs || {},
      partialOutputs: result.partialOutputs || {},
      errors: result.errors || [],
      logs,
    });
  } catch (err: any) {
    error(`Exception during graph execution: ${err.message}`);
    return res.status(500).json({
      error: err.message || "Unknown error occurred.",
      stack: err.stack || "",
      logs,
    });
  }
}