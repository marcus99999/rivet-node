import type { VercelRequest, VercelResponse } from '@vercel/node';
import { runGraphInFile, NodeDatasetProvider } from '@ironclad/rivet-node';
import path from 'path';
import fs from 'fs/promises';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { graph, inputs } = req.body;

  if (!graph) {
    return res.status(400).json({ error: 'Missing graph ID in request body.' });
  }

  // Extract bearer token from Authorization header
  const authHeader = req.headers.authorization || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  // Default to inputs passed directly
  let enrichedInputs = inputs || {};

  // If a crisisId is included, fetch crisis details
  if (enrichedInputs.crisisId) {
    try {
      const crisisRes = await fetch(`https://rivet-node.vercel.app/api/crises/${enrichedInputs.crisisId}`, {
        headers: {
          Authorization: `Bearer ${bearerToken}`,
          'Content-Type': 'application/json',
        },
      });
      const crisisJson = await crisisRes.json();
      if (crisisJson?.data) {
        enrichedInputs = {
          ...enrichedInputs,
          ...crisisJson.data, // Spread title, description, severity, etc.
        };
        console.log('🧠 Loaded crisis data:', JSON.stringify(crisisJson.data, null, 2));
      }
    } catch (err) {
      console.warn('⚠️ Failed to fetch crisis data:', err);
    }
  }

  try {
    const projectPath = path.resolve(process.cwd(), 'api/data/Master.rivet-project');
    const fileExists = await fs.access(projectPath).then(() => true).catch(() => false);

    if (!fileExists) {
      return res.status(404).json({ error: 'Project file not found.' });
    }

    const datasetProvider = await NodeDatasetProvider.fromProjectFile(projectPath, { save: false });

    console.log('🚀 Executing graph:', graph);
    console.log('🧾 Inputs:', JSON.stringify(enrichedInputs, null, 2));

    const start = Date.now();

    const result = await runGraphInFile(projectPath, {
      graph,
      remoteDebugger: undefined,
      inputs: enrichedInputs,
      openAiKey: process.env.OPENAI_API_KEY,
      context: bearerToken ? { bearerToken } : {},
      datasetProvider,
    });

    const duration = Date.now() - start;
    console.log(`✅ Graph executed in ${duration}ms`);

    const outputRoot = result.outputs;
    console.log('📦 Raw outputs:', JSON.stringify(outputRoot, null, 2));

    let resolvedValues: Record<string, unknown> = {};

    if (
      outputRoot &&
      typeof outputRoot === 'object' &&
      outputRoot.type === 'object' &&
      'fields' in outputRoot &&
      typeof (outputRoot as any).fields === 'object'
    ) {
      const fields = (outputRoot as any).fields;
      for (const [key, dataValue] of Object.entries(fields)) {
        const val = (dataValue as any)?.value;
        resolvedValues[key] = val;
        console.log(`🔹 Output "${key}":`, val);
      }
    } else if (
      outputRoot &&
      typeof outputRoot === 'object' &&
      'value' in outputRoot
    ) {
      const val = (outputRoot as any).value;
      resolvedValues['result'] = val;
      console.log(`🔹 Single output:`, val);
    } else {
      console.warn('⚠️ No recognizable outputs found.');
    }

    return res.status(200).json({
      message: 'Graph executed successfully.',
      outputs: resolvedValues,
      rawOutputs: outputRoot,
      errors: result.errors || [],
      context: result.context || {}
    });

  } catch (err) {
    console.error('❌ Graph execution failed:', err);
    return res.status(500).json({ error: 'Graph execution failed', details: (err as Error).message });
  }
}