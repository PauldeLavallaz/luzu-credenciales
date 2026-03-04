import { NextRequest, NextResponse } from "next/server";

const COMFY_KEY = process.env.COMFY_DEPLOY_API_KEY!;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params;

  try {
    const res = await fetch(
      `https://api.comfydeploy.com/api/run/${runId}`,
      {
        headers: { Authorization: `Bearer ${COMFY_KEY}` },
        cache: "no-store",
      }
    );

    if (!res.ok) {
      return NextResponse.json({ status: "pending" });
    }

    const data = await res.json();
    const status = data.status; // "not-started" | "running" | "success" | "failed"

    if (status === "success") {
      // Extract first image output
      const outputs = data.outputs || [];
      let outputUrl: string | null = null;

      for (const output of outputs) {
        if (output.data?.images?.length > 0) {
          outputUrl = output.data.images[0]?.url || output.data.images[0]?.filename;
          break;
        }
        if (output.data?.url) {
          outputUrl = output.data.url;
          break;
        }
      }

      // Fallback: check live_status outputs
      if (!outputUrl && data.live_status) {
        try {
          const ls = typeof data.live_status === "string"
            ? JSON.parse(data.live_status)
            : data.live_status;
          const imgs = ls?.outputs?.flatMap((o: { images?: { url?: string }[] }) => o.images || []) || [];
          if (imgs.length > 0) outputUrl = imgs[0].url;
        } catch {}
      }

      return NextResponse.json({ status: "success", output_url: outputUrl });
    }

    if (status === "failed") {
      return NextResponse.json({ status: "failed" });
    }

    return NextResponse.json({ status: "pending" });
  } catch (err) {
    console.error("status poll error:", err);
    return NextResponse.json({ status: "pending" });
  }
}
