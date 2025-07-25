import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'yaml';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectFiles = ['Master.rivet-project', 'Campaign-alignment.rivet-project'];

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    const allGraphs = [];

    for (const file of projectFiles) {
      const filePath = path.resolve(__dirname, 'data', file);
      const raw = await fs.readFile(filePath, 'utf-8');
      const parsed = parse(raw);

      const graphs = parsed.data?.graphs || {};
      const graphsArray = Object.entries(graphs).map(([id, g]: [string, any]) => ({
        id,
        name: g?.metadata?.name || '(Untitled)',
        file, // add file name for dropdown grouping
      }));

      allGraphs.push(...graphsArray);
    }

    res.status(200).json({ graphs: allGraphs });
  } catch (err) {
    console.error('❌ Failed to load graphs from project files:', err);
    res.status(500).json({ error: 'Unable to load graph list' });
  }
}