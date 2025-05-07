import { fileURLToPath } from 'url';
import path from 'path';
import { runGraphInFile, NodeDatasetProvider, RunGraphOptions } from '@ironclad/rivet-node';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ALLOWED_ORIGIN = 'https://v0-crisis-comms-control-input-yf.vercel.app';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      info: 'Send a POST request with a prompt to run the Rivet graph.',
    });
  }

  const token = req.headers.authorization?.replace('Bearer ', '');
  const expectedToken = process.env.AUTH_TOKEN;

  if (!expectedToken || token !== expectedToken) {
    console.warn('🚫 Forbidden request: missing or invalid token.');
    return res.status(403).json({ error: 'Forbidden: Invalid or missing token.' });
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

    console.log('📥 Received prompt:', inputPrompt);

    const openAiKey = process.env.OPEN_API_KEY;
    if (!openAiKey) {
      console.error('❌ OPEN_API_KEY is missing.');
      return res.status(500).json({ error: 'Missing OPEN_API_KEY environment variable.' });
    }

    const project = path.resolve(__dirname, 'data', 'Master.rivet-project');
    const graph = 'cGJILKi8TD1YSzAKUAzKV'; // Replace with your actual graph ID

    console.log('📂 Loading project from:', project);
    const datasetProvider = await NodeDatasetProvider.fromProjectFile(project, { save: false });

    console.log('🚀 Running graph:', graph);
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

    console.log('✅ Graph execution complete.');
    console.log('🟢 Outputs:', outputs);
    console.log('🟡 Partial Outputs:', partials);

    if (result.errors?.length) {
      console.warn('⚠️ Node-level errors:', result.errors);
    }

    res.status(200).json({
      message: 'Graph executed successfully.',
      prompt: inputPrompt,
      outputs,
      partialOutputs: partials,
      errors: result.errors || [],
    });
  } catch (err: any) {
    console.error('❌ Graph execution error:', err);
    res.status(500).json({
      error: err.message || 'Unknown error occurred.',
      stack: err.stack || '',
    });
  }
}