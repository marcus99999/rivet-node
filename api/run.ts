import type { VercelRequest, VercelResponse } from '@vercel/node';
import { runGraphInFile, NodeDatasetProvider } from '@ironclad/rivet-node';
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
    console.log('📁 Project path:', projectPath);

    const fileExists = await fs.access(projectPath).then(() => true).catch(() => false);
    if (!fileExists) {
      console.error('❌ Project file not found at path:', projectPath);
      return res.status(404).json({ error: 'Project file not found.' });
    }

    const datasetProvider = await NodeDatasetProvider.fromProjectFile(projectPath, { save: false });

    console.log('🚀 Executing graph:', graph);
    console.log('🧾 Inputs:', JSON.stringify(inputs, null, 2));

    const start = Date.now();

    const result = await runGraphInFile(projectPath, {
      graph,
      remoteDebugger: undefined,
      inputs: inputs || {},
      openAiKey: process.env.OPENAI_API_KEY,
      datasetProvider,
    });

    const duration = Date.now() - start;
    console.log(`✅ Graph executed in ${duration}ms`);

    const outputs = result.outputs || {};
    const outputKeys = Object.keys(outputs);
    console.log('📦 Raw outputs:', JSON.stringify(outputs, null, 2));
    console.log('🔑 Output keys:', outputKeys);

    const resolvedValues: Record<string, unknown> = {};
    for (const key of outputKeys) {
  const dataValue = outputs[key];
  const val = (dataValue as any)?.value;  // safely bypasses strict typing here
  resolvedValues[key] = val;
  console.log(`🔹 Output "${key}":`, val);
}

    if (Array.isArray(result.errors) && result.errors.length > 0) {
      console.warn('⚠️ Errors (if any):', JSON.stringify(result.errors, null, 2));
    } else {
      console.log('⚠️ Errors (if any): None');
    }

    return res.status(200).json({
      message: 'Graph executed successfully.',
      outputs: resolvedValues,
      rawOutputs: outputs,
      errors: result.errors || [],
      context: result.context || {}
    });

  } catch (err) {
    console.error('❌ Graph execution failed:', err);
    return res.status(500).json({ error: 'Graph execution failed', details: (err as Error).message });
  }
}