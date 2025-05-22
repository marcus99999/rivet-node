import { runGraphInFile, NodeDatasetProvider } from '@ironclad/rivet-node';
import path from 'path';
import fs from 'fs/promises';
export default async function handler(req, res) {
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
        console.log('📦 Raw outputs:', JSON.stringify(result.outputs, null, 2));
        console.log('🧠 Context (if any):', result.context || 'None');
        if (Array.isArray(result.errors) && result.errors.length > 0) {
            console.log('⚠️ Errors (if any):', JSON.stringify(result.errors, null, 2));
        }
        else {
            console.log('⚠️ Errors (if any): None');
        }
        return res.status(200).json({
            message: 'Graph executed successfully.',
            outputs: result.outputs || {},
            errors: result.errors || [],
            context: result.context || {}
        });
    }
    catch (err) {
        console.error('❌ Graph execution failed:', err);
        return res.status(500).json({ error: 'Graph execution failed', details: err.message });
    }
}
