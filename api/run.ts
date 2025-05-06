import { runGraphInFile, NodeDatasetProvider, RunGraphOptions } from '@ironclad/rivet-node';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import path from 'path';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    console.log("API called");

    const openAiKey = process.env.OPEN_API_KEY;
    if (!openAiKey) {
      console.error("Missing OPEN_API_KEY");
      return res.status(500).json({ error: 'Missing OPEN_API_KEY environment variable.' });
    }

    // ✅ Safer absolute path — assumes file is located in /api/data/
    const project = path.resolve(__dirname, 'data', 'example.rivet-project');
    const graph = 'example-graph';

    console.log("Resolved project path:", project);

    const datasetProvider = await NodeDatasetProvider.fromProjectFile(project, {
      save: true
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

    console.log("Graph complete");
    res.status(200).json({ result: result.response.value });
  } catch (err: any) {
    console.error("Error running graph:", err);
    res.status(500).json({ error: err.message || 'Unknown error occurred.' });
  }
}