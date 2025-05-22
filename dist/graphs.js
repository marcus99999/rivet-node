import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'yaml';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export default async function handler(req, res) {
    try {
        const filePath = path.resolve(__dirname, 'data', 'Master.rivet-project');
        const raw = await fs.readFile(filePath, 'utf-8');
        const parsed = parse(raw); // 🔁 YAML parsing instead of JSON
        const graphs = parsed.data?.graphs || {};
        const result = Object.entries(graphs).map(([id, g]) => ({
            id,
            name: g?.metadata?.name || '(Untitled)',
        }));
        res.status(200).json({ graphs: result });
    }
    catch (err) {
        console.error('❌ Failed to load graphs from Master.rivet-project:', err);
        res.status(500).json({ error: 'Unable to load graph list' });
    }
}
