import 'dotenv/config';
import { runGraphInFile, NodeDatasetProvider, startDebuggerServer } from '@ironclad/rivet-node';
import path from 'path';
import fs from 'fs/promises';
export default async function handler(req, res) {
    if (req.method === 'OPTIONS') {
        return res.status(200).json({});
    }
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }
    const { graph, inputs, crisisDocumentId } = req.body;
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
        // 🚀 Start Rivet Remote Debugger (LOCAL ONLY)
        let remoteDebugger = undefined;
        if (process.env.NODE_ENV !== 'production') {
            try {
                remoteDebugger = await startDebuggerServer({
                    port: 4000,
                    host: '0.0.0.0'
                });
                console.log(`🪲 Rivet Remote Debugger started on ws://localhost:4000`);
            }
            catch (err) {
                console.warn('⚠️ Could not start Remote Debugger server:', err);
            }
        }
        else {
            console.log('ℹ️ Production mode - not starting Remote Debugger');
        }
        console.log('🚀 Executing graph:', graph);
        console.log('🧾 Inputs:', JSON.stringify(inputs, null, 2));
        console.log('📄 Crisis document ID:', crisisDocumentId);
        const start = Date.now();
        const result = await runGraphInFile(projectPath, {
            graph,
            remoteDebugger,
            inputs: inputs || {},
            openAiKey: process.env.OPENAI_API_KEY,
            datasetProvider
        });
        const duration = Date.now() - start;
        console.log(`✅ Graph executed in ${duration}ms`);
        const outputRoot = result.outputs;
        console.log('📦 Raw outputs:', JSON.stringify(outputRoot, null, 2));
        let resolvedValues = {};
        if (outputRoot &&
            typeof outputRoot === 'object' &&
            outputRoot.type === 'object' &&
            'fields' in outputRoot &&
            typeof outputRoot.fields === 'object') {
            const fields = outputRoot.fields;
            console.log('🔑 Output keys:', Object.keys(fields));
            for (const [key, dataValue] of Object.entries(fields)) {
                const val = dataValue?.value;
                resolvedValues[key] = val;
                console.log(`🔹 Output "${key}":`, val);
            }
        }
        else if (outputRoot &&
            typeof outputRoot === 'object' &&
            'value' in outputRoot) {
            const val = outputRoot.value;
            resolvedValues['result'] = val;
            console.log(`🔹 Single output:`, val);
        }
        else {
            console.warn('⚠️ No recognizable outputs found.');
        }
        if (Array.isArray(result.errors) && result.errors.length > 0) {
            console.warn('⚠️ Errors (if any):', JSON.stringify(result.errors, null, 2));
        }
        else {
            console.log('⚠️ Errors (if any): None');
        }
        return res.status(200).json({
            message: 'Graph executed successfully.',
            outputs: resolvedValues,
            rawOutputs: outputRoot,
            errors: result.errors || [],
            context: result.context || {}
        });
    }
    catch (err) {
        console.error('❌ Graph execution failed:', err);
        return res.status(500).json({ error: 'Graph execution failed', details: err.message });
    }
}
