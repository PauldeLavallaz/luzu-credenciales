import { NextRequest, NextResponse } from "next/server";

const COMFY_KEY = process.env.COMFY_DEPLOY_API_KEY!;
const DEPLOYMENT_ID = "119b844e-869f-40cb-9f74-8f8e9b2b9086";

export async function POST(req: NextRequest) {
  try {
    // El cliente ya subió la foto directo al EC2 y nos pasa solo la URL (sin pasar por Vercel)
    const { photoUrl: personajeUrl, name, email } = await req.json();

    if (!personajeUrl || !name || !email) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
    }

    // Launch ComfyDeploy run — solo "personaje" como input
    const comfyRes = await fetch(
      "https://api.comfydeploy.com/api/run/deployment/queue",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${COMFY_KEY}`,
        },
        body: JSON.stringify({
          deployment_id: DEPLOYMENT_ID,
          inputs: { personaje: personajeUrl },
        }),
      }
    );

    if (!comfyRes.ok) {
      console.error("ComfyDeploy error:", await comfyRes.text());
      return NextResponse.json({ error: "Error al iniciar la generación" }, { status: 500 });
    }

    const comfyData = await comfyRes.json();
    const runId = comfyData.run_id;

    console.log(`[LEAD] name="${name}" email="${email}" run_id=${runId} ts=${new Date().toISOString()}`);

    // Fire-and-forget al EC2 — polling server-side + email aunque el cliente cierre la pestaña
    fetch("https://skills.morfeolabs.com/api/watch-job", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ run_id: runId, email, name }),
    }).catch((err) => console.error("watch-job notify error:", err));

    return NextResponse.json({ run_id: runId, ok: true });
  } catch (err) {
    console.error("generate error:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
