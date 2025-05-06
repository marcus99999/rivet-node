import { fileURLToPath } from 'url';
import path from 'path';
import { runGraphInFile, NodeDatasetProvider, RunGraphOptions } from '@ironclad/rivet-node';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // ✅ Respond immediately to client
  res.status(202).json({ message: 'Graph execution started in background.' });

  try {
    console.log("🔁 Background execution started");

    const openAiKey = process.env.OPEN_API_KEY;
    if (!openAiKey) {
      console.error("❌ Missing OPEN_API_KEY");
      return;
    }

    const project = path.resolve(__dirname, 'data', 'Master.rivet-project');
    const graph = 'cGJILKi8TD1YSzAKUAzKV'; // Master graph ID

    const datasetProvider = await NodeDatasetProvider.fromProjectFile(project, {
      save: false
    });

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

    console.log("✅ Graph completed");

    // Log all graph outputs
    const outputs = result.outputs || {};
    if (Object.keys(outputs).length > 0) {
      console.log("📤 Graph outputs:");
      for (const [key, value] of Object.entries(outputs)) {
        console.log(`- ${key}:`, value);
      }
    } else {
      console.log("⚠️ No graph outputs returned.");
    }

    // Log subgraph partial outputs
    const partials = result.partialOutputs || {};
    if (Object.keys(partials).length > 0) {
      console.log("🧩 Subgraph partial outputs:");
      for (const [key, value] of Object.entries(partials)) {
        console.log(`- ${key}:`, value);
      }
    }

  } catch (err: any) {
    console.error("❌ Error in background execution:", err.message || err);
  }
}