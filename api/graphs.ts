import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function handler(req, res) {
  try {
    const filePath = path.resolve(__dirname, 'data', 'Master.rivet-project');
    const raw = await fs.readFile(filePath, 'utf-8');
    const json = JSON.parse(raw);

    const graphs = json.data.graphs || {};
    const result = Object.entries(graphs).map(([id, graph]) => ({
      id,
      name: graph.metadata?.name || '(Untitled)',
    }));

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ graphs: result }));
  } catch (err) {
    console.error('Failed to load graphs:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Unable to load graph list' }));
  }
}