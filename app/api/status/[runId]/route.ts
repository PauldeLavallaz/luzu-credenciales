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
      const outputs = data.outputs || [];
      let outputUrl: string | null = null;

      // Buscar imagen en outputs (el node Banana_00001_.png está en node_id "13")
      for (const output of outputs) {
        if (output.data?.images?.length > 0) {
          outputUrl = output.data.images[0]?.url || output.data.images[0]?.filename;
          if (outputUrl) break;
        }
        if (output.data?.url) {
          outputUrl = output.data.url;
          break;
        }
      }

      if (outputUrl) {
        console.log(`[STATUS] run=${runId} → output_url=${outputUrl}`);
        return NextResponse.json({ status: "success", output_url: outputUrl });
      }

      // Si no hay imagen todavía, devolver pending para que siga polling
      console.warn(`[STATUS] run=${runId} marked success but no image yet. outputs count=${outputs.length}`);
      return NextResponse.json({ status: "pending" });
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
