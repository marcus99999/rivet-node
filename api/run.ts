import { runGraphInFile, startDebuggerServer, NodeDatasetProvider, RunGraphOptions } from '@ironclad/rivet-node';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    console.log("API called");

    const openAiKey = process.env.OPEN_API_KEY;
    if (!openAiKey) {
      console.error("Missing OPEN_API_KEY");
      return res.status(500).json({ error: 'Missing OPEN_API_KEY environment variable.' });
    }

    const project = './example.rivet-project';
    const graph = 'example-graph';

    console.log("Starting debugger...");
    const debuggerServer = await startDebuggerServer({});
    console.log("Debugger started");

    const datasetProvider = await NodeDatasetProvider.fromProjectFile(project, {
      save: true,
      filePath: project,
    });

    console.log("Running graph...");
    const result = await runGraphInFile(project, {
      graph,
      remoteDebugger: debuggerServer,
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