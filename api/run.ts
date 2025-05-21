import type { VercelRequest, VercelResponse } from '@vercel/node';
import { runGraphInFile, NodeDatasetProvider, startDebuggerServer } from '@ironclad/rivet-node';
import path from 'path';
import fs from 'fs/promises';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { graph, inputs } = req.body;

  if (!graph) {
    return res.status(400).json({ error: 'Missing graph ID in request body.' });
  }

  try {
    const projectPath = path.resolve(process.cwd(), 'api/data/Master.rivet-project');
    const fileExists = await fs.access(projectPath).then(() => true).catch(() => false);
    if (!fileExists) {
      return res.status(404).json({ error: 'Project file not found.' });
    }

    const debuggerServer = undefined;
    const datasetProvider = await NodeDatasetProvider.fromProjectFile(projectPath, { save: false });

    const result = await runGraphInFile(projectPath, {
  graph,
  remoteDebugger: undefined,
  inputs: inputs || {},
  openAiKey: process.env.OPENAI_API_KEY,
  datasetProvider,
});

    return res.status(200).json({
      message: 'Graph executed successfully.',
      outputs: result.outputs || {},
      errors: result.errors || [],
      context: result.context || {}
    });

  } catch (err) {
    console.error('❌ Graph execution failed:', err);
    return res.status(500).json({ error: 'Graph execution failed', details: (err as Error).message });
  }
}