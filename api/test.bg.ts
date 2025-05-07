import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // ✅ Respond immediately to the client
  res.status(202).json({ message: "Background task started." });

  // 👇 Background logic starts here
  try {
    console.log("🔁 Background task running...");

    // Simulate a long-running task
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log("✅ Background task complete.");
  } catch (err: any) {
    console.error("❌ Error during background task:", err.message || err);
  }
}