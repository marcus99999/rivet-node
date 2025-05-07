import { fileURLToPath } from 'url';
import path from 'path';
import { runGraphInFile, NodeDatasetProvider, RunGraphOptions } from '@ironclad/rivet-node';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    return res.status(200).json({
      info: 'Send a POST request with a prompt to run the Rivet graph.',
    });
  }

  try {
    const body =
      typeof req.body === 'object'
        ? req.body
        : await new Promise(resolve => {
            let data = '';
            req.on('data', chunk => (data += chunk));
            req.on('end', () => {
              try {
                resolve(JSON.parse(data || '{}'));
              } catch (err) {
                console.error('❌ Failed to parse JSON body:', err);
                resolve({});
              }
            });
          });

    const inputPrompt =
      typeof body === 'object' && body.prompt
        ? body.prompt
        : 'Please write me a short poem about a dog.';

    const openAiKey = process.env.OPEN_API_KEY;
    if (!openAiKey) {
      return res.status(500).json({ error: 'Missing OPEN_API_KEY environment variable.' });
    }

    const project = path.resolve(__dirname, 'data', 'Master.rivet-project');
    const graph = 'cGJILKi8TD1YSzAKUAzKV'; // Replace if using a different graph ID

    const datasetProvider = await NodeDatasetProvider.fromProjectFile(project, {
      save: false,
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

    const outputs = result.outputs || {};
    const partials = result.partialOutputs || {};

    res.status(200).json({
      message: 'Graph executed successfully.',
      prompt: inputPrompt,
      outputs,
      partialOutputs: partials,
    });
  } catch (err: any) {
    console.error('❌ Graph execution error:', err.message || err);
    res.status(500).json({ error: err.message || 'Unknown error occurred.' });
  }
}