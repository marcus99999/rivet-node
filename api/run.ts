import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  loadProjectFromFile,
  runGraphInProject,
  startRivetDebuggerServer,
} from "@ironclad/rivet-node";
import path from "path";
import fs from "fs/promises";

// Local debugger enable flag
const ENABLE_DEBUGGER = process.env.LOCAL_DEBUGGER === "true";

let debuggerStarted = false;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log("⚙️ Received request to run graph.");

  try {
    const projectPath = path.resolve("./api/data/Master.rivet-project");
    const projectFile = await fs.readFile(projectPath, "utf-8");
    const project = await loadProjectFromFile(projectPath);
    console.log("✅ Loaded project");

    const graphId = req.body?.graphId;
    const inputs = req.body?.inputs || {};

    if (!graphId) {
      console.error("❌ No graphId provided");
      return res.status(400).json({ error: "Missing graphId" });
    }

    console.log(`▶️ Running graph ${graphId} with inputs:`, inputs);

    // Start debugger server if local and not already started
    if (ENABLE_DEBUGGER && !debuggerStarted) {
      startRivetDebuggerServer({
        port: 3000,
      });
      debuggerStarted = true;
      console.log("🧑‍💻 Started Rivet debugger server on port 3000");
    }

    const result = await runGraphInProject({
      project,
      graphId,
      inputs,
    });

    console.log("📦 Graph outputs:", result.outputs);

    res.status(200).json({
      outputs: result.outputs,
      errors: result.errors,
    });
  } catch (err: any) {
    console.error("❌ Error running graph:", err);
    res.status(500).json({ error: err.message || "Unknown error" });
  }
}