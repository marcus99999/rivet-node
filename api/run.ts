import { runGraphInFile, startDebuggerServer, NodeDatasetProvider, RunGraphOptions } from '@ironclad/rivet-node';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const openAiKey = process.env.OPEN_API_KEY;
    if (!openAiKey) {
      return res.status(500).json({ error: 'Missing OPEN_API_KEY environment variable.' });
    }

    const project = './example.rivet-project';
    const graph = 'example-graph';

    const debuggerServer = await startDebuggerServer({});

    const datasetProvider = await NodeDatasetProvider.fromProjectFile(project, {
      save: true,
      filePath: project,
    });

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

    res.status(200).json({ result: result.response.value });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Unknown error occurred.' });
  }
}