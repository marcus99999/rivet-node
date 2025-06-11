import type { VercelRequest, VercelResponse } from '@vercel/node';
import { startDebuggerServer } from '@ironclad/rivet-node';

let debuggerServerStarted = false;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    if (!debuggerServerStarted) {
      await startDebuggerServer({ port: 4000, host: '0.0.0.0' });
      debuggerServerStarted = true;
      console.log('🪲 Rivet Remote Debugger started on ws://localhost:4000');
    } else {
      console.log('ℹ️ Rivet Remote Debugger already running.');
    }

    return res.status(200).json({ message: 'Remote Debugger started.' });
  } catch (err) {
    console.error('❌ Failed to start Remote Debugger:', err);
    return res.status(500).json({ error: 'Failed to start Remote Debugger', details: (err as Error).message });
  }
}