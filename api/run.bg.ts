import { fileURLToPath } from 'url';
import path from 'path';
import { runGraphInFile, NodeDatasetProvider, RunGraphOptions } from '@ironclad/rivet-node';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // ✅ Handle browser GET requests (informational only)
  if (req.method === 'GET') {
    return res.status(200).json({
      info: 'This is a background function. Use POST with a "prompt" to trigger graph execution.',
    });
  }

  // ✅ Parse incoming JSON body manually
  let inputPrompt = 'Please write me a short poem about a dog.';
  if (req.method === 'POST') {
    req.body = await new Promise((resolve) => {
      let data = '';
      req.on('data', (chunk) => (data += chunk));
      req.on('end', () => {
        try {
          const parsed = JSON.parse(data || '{}');
          inputPrompt = parsed.prompt || inputPrompt;
          resolve(parsed);
        } catch (err) {
          console.error('❌ Invalid JSON body:', err);
          resolve({});
        }
      });
    });
  }

  // ✅ Respond to client right away
  res.status(202).json({
    message: `Graph started with prompt: "${inputPrompt}"`,
  });

  // ✅ Background work
  try {
    console.log("🔁 Background task started with prompt:", inputPrompt);

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
      inputs: { prompt: inputPrompt },
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