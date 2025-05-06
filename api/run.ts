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
        prompt: 'Please write me a short poem about a dog.',
      },
      context: {},
      externalFunctions: {},
      onUserEvent: {},
      openAiKey,
      datasetProvider,
    } as RunGraphOptions);

    console.log("Graph result:", result);

    const outputs = result.outputs || {};

    res.status(200).json({
      outputs,
      message: Object.keys(outputs).length === 0
        ? 'Graph ran, but no outputs were returned.'
        : 'Graph executed successfully.'
    });
  } catch (err: any) {
    console.error("Error running graph:", err);
    res.status(500).json({ error: err.message || 'Unknown error occurred.' });
  }
}