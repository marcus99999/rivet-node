import { fileURLToPath } from "url";
import path from "path";
import { runGraphInFile, NodeDatasetProvider, RunGraphOptions } from "@ironclad/rivet-node";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Allow multiple environments
const ALLOWED_ORIGINS = [
	"https://v0-crisis-comms-control-input-yf.vercel.app",
	"https://rivet-node-git-main-marcus-projects-2b234dbd.vercel.app",
	"http://localhost:3000",
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
	const origin = req.headers.origin || "";
	if (ALLOWED_ORIGINS.includes(origin)) {
		res.setHeader("Access-Control-Allow-Origin", origin);
	}

	res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
	res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

	if (req.method === "OPTIONS") {
		return res.status(200).end();
	}

	// ✅ Debug OPEN_AI_KEY presence and list all env vars
	console.log("🔍 OPEN_AI_KEY:", process.env.OPEN_AI_KEY ? "✅ Present" : "❌ Missing");
	console.log("🧪 All ENV Keys:", Object.keys(process.env));

	if (req.method === "GET") {
		return res.status(200).json({
			info: "Send a POST request with a prompt to run the Rivet graph.",
		});
	}

	const token = req.headers.authorization?.replace("Bearer ", "");
	const expectedToken = process.env.AUTH_TOKEN;

	if (!expectedToken || token !== expectedToken) {
		console.warn("🚫 Forbidden request: missing or invalid token.");
		return res.status(403).json({ error: "Forbidden: Invalid or missing token." });
	}

	try {
		//expected body:
		// {
		//   "graph": graphId,
		//   "inputs": {
		//     "documentId": documentId
		//   }
		// }
		const { graph, inputs } = req.body;

		if (!graph || !inputs || !inputs.documentId) {
			console.error("❌ Missing data.");
			throw new Error("Missing graph and/or documentId.");
		}

		// const graph = "cGJILKi8TD1YSzAKUAzKV"; // Replace with your actual graph ID

		// const body =
		// 	typeof req.body === "object"
		// 		? req.body
		// 		: await new Promise((resolve) => {
		// 				let data = "";
		// 				req.on("data", (chunk) => (data += chunk));
		// 				req.on("end", () => {
		// 					try {
		// 						resolve(JSON.parse(data || "{}"));
		// 					} catch (err) {
		// 						console.error("❌ Failed to parse JSON body:", err);
		// 						resolve({});
		// 					}
		// 				});
		// 		  });

		// const inputPrompt =
		// 	typeof body === "object" && body.prompt
		// 		? body.prompt
		// 		: "Please write me a short poem about a dog.";

		console.log("📥 Received prompt/documentId:", inputs.documentId);

		const openAiKey = process.env.OPEN_AI_KEY;
		if (!openAiKey) {
			console.error("❌ OPEN_AI_KEY is missing.");
			return res.status(500).json({ error: "Missing OPEN_AI_KEY environment variable." });
		}

		const project = path.resolve(__dirname, "data", "Master.rivet-project");

		console.log("📂 Loading project from:", project);
		const datasetProvider = await NodeDatasetProvider.fromProjectFile(project, { save: false });

		console.log("🚀 Running graph:", graph);
		const result = await runGraphInFile(project, {
			graph,
			remoteDebugger: undefined,
			inputs: { prompt: inputs.documentId },
			context: {},
			externalFunctions: {},
			onUserEvent: {},
			openAiKey,
			datasetProvider,
		} as RunGraphOptions);

		const outputs = result.outputs || {};
		const partials = result.partialOutputs || {};

		console.log("✅ Graph execution completed.");
		console.log("🟢 Outputs:", outputs);
		console.log("🟡 Partial Outputs:", partials);

		if (result.errors?.length) {
			console.warn("⚠️ Node-level errors:", result.errors);
		}

		res.status(200).json({
			message: "Graph executed successfully.",
			prompt: inputs.documentId,
			outputs,
			partialOutputs: partials,
			errors: result.errors || [],
		});
	} catch (err: any) {
		console.error("❌ Graph execution error:", err);
		res.status(500).json({
			error: err.message || "Unknown error occurred.",
			stack: err.stack || "",
		});
	}
}

// import type { VercelRequest, VercelResponse } from '@vercel/node';
// import { runGraphInFile, NodeDatasetProvider } from '@ironclad/rivet-node';
// import path from 'path';
// import fs from 'fs/promises';

// export default async function handler(req: VercelRequest, res: VercelResponse) {
//   if (req.method === 'OPTIONS') {
//     return res.status(200).json({});
//   }
//   if (req.method !== 'POST') {
//     return res.status(405).json({ error: 'Method Not Allowed' });
//   }

//   const { graph, inputs } = req.body;

//   if (!graph) {
//     return res.status(400).json({ error: 'Missing graph ID in request body.' });
//   }

//   // Extract bearer token from Authorization header
//   const authHeader = req.headers.authorization || '';
//   const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

//   // Default to inputs passed directly
//   let enrichedInputs = inputs || {};

//   // If a crisisId is included, fetch crisis details
//   if (enrichedInputs.crisisId) {
//     try {
//       const crisisRes = await fetch(`https://rivet-node.vercel.app/api/crises/${enrichedInputs.crisisId}`, {
//         headers: {
//           Authorization: `Bearer ${bearerToken}`,
//           'Content-Type': 'application/json',
//         },
//       });
//       const crisisJson = await crisisRes.json();
//       if (crisisJson?.data) {
//         enrichedInputs = {
//           ...enrichedInputs,
//           ...crisisJson.data, // Spread title, description, severity, etc.
//         };
//         console.log('🧠 Loaded crisis data:', JSON.stringify(crisisJson.data, null, 2));
//       }
//     } catch (err) {
//       console.warn('⚠️ Failed to fetch crisis data:', err);
//     }
//   }

//   try {
//     const projectPath = path.resolve(process.cwd(), 'api/data/Master.rivet-project');
//     const fileExists = await fs.access(projectPath).then(() => true).catch(() => false);

//     if (!fileExists) {
//       return res.status(404).json({ error: 'Project file not found.' });
//     }

//     const datasetProvider = await NodeDatasetProvider.fromProjectFile(projectPath, { save: false });

//     console.log('🚀 Executing graph:', graph);
//     console.log('🧾 Inputs:', JSON.stringify(enrichedInputs, null, 2));

//     const start = Date.now();

//     const result = await runGraphInFile(projectPath, {
//       graph,
//       remoteDebugger: undefined,
//       inputs: enrichedInputs,
//       openAiKey: process.env.OPENAI_API_KEY,
//       context: bearerToken ? { bearerToken } : {},
//       datasetProvider,
//     });

//     const duration = Date.now() - start;
//     console.log(`✅ Graph executed in ${duration}ms`);

//     const outputRoot = result.outputs;
//     console.log('📦 Raw outputs:', JSON.stringify(outputRoot, null, 2));

//     let resolvedValues: Record<string, unknown> = {};

//     if (
//       outputRoot &&
//       typeof outputRoot === 'object' &&
//       outputRoot.type === 'object' &&
//       'fields' in outputRoot &&
//       typeof (outputRoot as any).fields === 'object'
//     ) {
//       const fields = (outputRoot as any).fields;
//       for (const [key, dataValue] of Object.entries(fields)) {
//         const val = (dataValue as any)?.value;
//         resolvedValues[key] = val;
//         console.log(`🔹 Output "${key}":`, val);
//       }
//     } else if (
//       outputRoot &&
//       typeof outputRoot === 'object' &&
//       'value' in outputRoot
//     ) {
//       const val = (outputRoot as any).value;
//       resolvedValues['result'] = val;
//       console.log(`🔹 Single output:`, val);
//     } else {
//       console.warn('⚠️ No recognizable outputs found.');
//     }

//     return res.status(200).json({
//       message: 'Graph executed successfully.',
//       outputs: resolvedValues,
//       rawOutputs: outputRoot,
//       errors: result.errors || [],
//       context: result.context || {}
//     });

//   } catch (err) {
//     console.error('❌ Graph execution failed:', err);
//     return res.status(500).json({ error: 'Graph execution failed', details: (err as Error).message });
//   }
// }
