import { runGraphInFile, NodeDatasetProvider, RunGraphOptions } from '@ironclad/rivet-node';
import { fileURLToPath } from 'url';
import path from 'path';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  try {
    const body = typeof req.body === 'object'
      ? req.body
      : await new Promise(resolve => {
          let data = '';
          req.on('data', chunk => (data += chunk));
          req.on('end', () => resolve(JSON.parse(data || '{}')));
        });

    const prompt = body.prompt || 'ye8w2fo87pymtxxfx0vyfzaa';
    const graphId = body.graph || '(GHgi_Qdv5HEfN9Cwup8cY'; // ← Replace this!
    const openAiKey = process.env.OPEN_AI_KEY;

    if (!openAiKey) {
      return res.status(500).json({ error: 'Missing OPEN_AI_KEY environment variable.' });
    }

    const projectPath = path.resolve(__dirname, 'data', 'Master.rivet-project');
    const datasetProvider = await NodeDatasetProvider.fromProjectFile(projectPath, { save: false });

    const result = await runGraphInFile(projectPath, {
      graph: graphId,
      openAiKey,
      inputs: { prompt },
      context: {},
      externalFunctions: {},
      onUserEvent: {},
      datasetProvider
    } as RunGraphOptions);

    res.status(200).json({
      message: 'Severity estimated successfully.',
      outputs: result.outputs || {},
      errors: result.errors || []
    });
  } catch (err: any) {
    console.error('❌ Graph execution failed:', err);
    res.status(500).json({ error: err.message || 'Unknown error' });
  }
}