import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import YAML from 'yaml';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const projectPath = path.resolve(__dirname, 'data', 'Master.rivet-project');
    const raw = await fs.readFile(projectPath, 'utf-8');

    // 👇 Use YAML parser instead of JSON
    const project = YAML.parse(raw);

    const graphs = Object.entries(project.data?.graphs || {}).map(([id, data]: any) => ({
      id,
      name: data?.metadata?.name || id,
    }));

    res.status(200).json({ graphs });
  } catch (err: any) {
    console.error('❌ Failed to read graphs:', err);
    res.status(500).json({ error: 'Failed to load graphs.' });
  }
}