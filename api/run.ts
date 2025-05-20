import { fileURLToPath } from 'url';
import path from 'path';
import { runGraphInFile, NodeDatasetProvider, RunGraphOptions } from '@ironclad/rivet-node';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Allow multiple environments
const ALLOWED_ORIGINS = [
  'https://v0-crisis-comms-control-input-yf.vercel.app',
  'https://rivet-node-git-main-marcus-projects-2b234dbd.vercel.app',
  'http://localhost:3000'
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin || '';
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  console.log('🔍 OPEN_AI_KEY:', process.env.OPEN_AI_KEY ? '✅ Present' : '❌ Missing');
  console.log('🧪 All ENV Keys:', Object.keys(process.env));

  if (req.method === 'GET') {
    return res.status(200).json({
      info: 'Send a POST request with a prompt and optional graph ID to run a Rivet graph.',
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

    const inputPrompt = typeof body === 'object' && body.prompt
      ? body.prompt
      : 'Please write me a short poem about a dog.';

    const graphId = typeof body === 'object' && body.graph
      ? body.graph
      : 'cGJILKi8TD1YSzAKUAzKV'; // 👈 Your master graph ID

    const title = typeof body === 'object' && body.title
      ? body.title
      : 'Untitled';

    console.log('📥 Received Crisis ID:', inputPrompt);
    console.log('🧭 Graph to run:', graphId);
    console.log('📝 Title:', title);

    const openAiKey = process.env.OPEN_AI_KEY;
    if (!openAiKey) {
      console.error('❌ OPEN_AI_KEY is missing.');
      return res.status(500).json({ error: 'Missing OPEN_AI_KEY environment variable.' });
    }

    const project = path.resolve(__dirname, 'data', 'Master.rivet-project');
    console.log('📂 Loading project from:', project);

    const datasetProvider = await NodeDatasetProvider.fromProjectFile(project, { save: false });

    console.log('🚀 Running graph:', graphId);
    const result = await runGraphInFile(project, {
      graph: graphId,
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
      graph: graphId,
      prompt: inputPrompt,
      title,
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