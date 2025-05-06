import { fileURLToPath } from 'url';
import path from 'path';
import { runGraphInFile, NodeDatasetProvider, RunGraphOptions } from '@ironclad/rivet-node';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    console.log("API called");

    const openAiKey = process.env.OPEN_API_KEY;
    if (!openAiKey) {
      return res.status(500).json({ error: 'Missing OPEN_API_KEY environment variable.' });
    }

    const project = path.resolve(__dirname, 'data', 'Master.rivet-project');
    const graph = 'cGJILKi8TD1YSzAKUAzKV'; // Master graph ID

    const datasetProvider = await NodeDatasetProvider.fromProjectFile(project, {
      save: false
    });

    console.log("Running graph...");
    const result = await runGraphInFile(project, {
      graph,
      remoteDebugger: undefined,
      inputs: {
        prompt: 'eg2mhbnnt16dyaomt4dvtti2.',
      },
      context: {},
      externalFunctions: {},
      onUserEvent: {},
      openAiKey,
      datasetProvider,
    } as RunGraphOptions);

    console.log("✅ Graph executed.");

    // Log standard outputs
    const outputs = result.outputs || {};
    if (Object.keys(outputs).length > 0) {
      console.log("📤 Graph outputs:");
      for (const [key, value] of Object.entries(outputs)) {
        console.log(`- ${key}:`, value);
      }
    } else {
      console.log("⚠️ No outputs returned from graph.");
    }

    // Log subgraph partial outputs (if any)
    const partials = result.partialOutputs || {};
    if (Object.keys(partials).length > 0) {
      console.log("🧩 Subgraph partial outputs:");
      for (const [key, value] of Object.entries(partials)) {
        console.log(`- ${key}:`, value);
      }
    }

    res.status(200).json({
      outputs,
      partialOutputs: partials,
      message:
        Object.keys(outputs).length === 0 && Object.keys(partials).length === 0
          ? 'Graph ran, no outputs were returned.'
          : 'Graph executed successfully.'
    });
  } catch (err: any) {
    console.error("❌ Error running graph:", err);
    res.status(500).json({ error: err.message || 'Unknown error occurred.' });
  }
}