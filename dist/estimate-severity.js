import { runGraphInFile, NodeDatasetProvider } from '@ironclad/rivet-node';
import { fileURLToPath } from 'url';
import path from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.statusCode = 405;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Only POST allowed' }));
        return;
    }
    try {
        const body = await new Promise((resolve, reject) => {
            let data = '';
            req.on('data', (chunk) => {
                data += chunk.toString();
            });
            req.on('end', () => {
                try {
                    resolve(JSON.parse(data || '{}'));
                }
                catch (err) {
                    reject(err);
                }
            });
        });
        const prompt = body.prompt || 'ye8w2fo87pymtxxfx0vyfzaa';
        const graphId = body.graph || 'GHgi_Qdv5HEfN9Cwup8cY'; // replace with your actual severity-estimator graph ID
        const openAiKey = process.env.OPEN_AI_KEY;
        if (!openAiKey) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Missing OPEN_AI_KEY environment variable.' }));
            return;
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
            datasetProvider,
        });
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
            message: 'Severity estimated successfully.',
            outputs: result.outputs || {},
            errors: result.errors || [],
        }));
    }
    catch (err) {
        console.error('❌ Graph execution failed:', err);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: err.message || 'Unknown error' }));
    }
}
