import { fileURLToPath } from 'url';
import path from 'path';
import { runGraphInFile, NodeDatasetProvider, RunGraphOptions } from '@ironclad/rivet-node';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Respond immediately
  res.status(202).json({ message: 'Graph execution started in background.' });

  try {
    console.log("🔁 Background task started");

    // Parse JSON body manually for background function
    if (req.method === 'POST') {
      req.body = await new Promise(resolve => {
        let data = '';
        req.on('data', chunk => data += chunk);
        req.on('end', () => {
          try {
            resolve(JSON.parse(data || '{}'));
          } catch (e) {
            console.error("❌ Failed to parse JSON body:", e);
            resolve({});
          }
        });
      });
    }

    const { prompt } = req.body || {};
    const inputPrompt = prompt || 'Please write me a short poem about a dog.';

    const openAiKey = process.env.OPEN_API_KEY;
    if (!openAiKey) {
      console.error("❌ Missing OPEN_API_KEY");
      return;
    }

    const project = path.resolve(__dirname, 'data', 'Master.rivet-project');
    const graph = 'cGJILKi8TD1YSzAKUAzKV';

    const datasetProvider = await NodeDatasetProvider.fromProjectFile(project, {
      save: false
    });

    const result = await runGraphInFile(project, {
      graph,
      remoteDebugger: undefined,
      inputs: {
        prompt: inputPrompt,
      },
      context: {},
      externalFunctions: {},
      onUserEvent: {},
      openAiKey,
      datasetProvider,
    } as RunGraphOptions);

    console.log("✅ Graph complete");

    for (const [key, value] of Object.entries(result.outputs || {})) {
      console.log(`📤 Output ${key}:`, value);
    }

    for (const [key, value] of Object.entries(result.partialOutputs || {})) {
      console.log(`🧩 Sub-output ${key}:`, value);
    }

  } catch (err: any) {
    console.error("❌ Background graph error:", err.message || err);
  }
}