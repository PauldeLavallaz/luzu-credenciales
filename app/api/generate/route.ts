import { NextRequest, NextResponse } from "next/server";

const COMFY_KEY = process.env.COMFY_DEPLOY_API_KEY!;
const DEPLOYMENT_ID = "119b844e-869f-40cb-9f74-8f8e9b2b9086";

export async function POST(req: NextRequest) {
  try {
    const { photoUrl, photoPath, name, email } = await req.json();

    if (!photoUrl || !name || !email) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
    }

    // Lanzar job en ComfyDeploy — solo "personaje"
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
          inputs: { personaje: photoUrl },
        }),
      }
    );

    if (!comfyRes.ok) {
      console.error("ComfyDeploy error:", await comfyRes.text());
      return NextResponse.json({ error: "Error al iniciar la generación" }, { status: 500 });
    }

    const { run_id: runId } = await comfyRes.json();
    console.log(`[LEAD] name="${name}" email="${email}" run_id=${runId}`);

    // Fire-and-forget al EC2: polling server-side + email + borrado del archivo temporal
    fetch("https://skills.morfeolabs.com/api/watch-job", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ run_id: runId, email, name, photo_path: photoPath }),
    }).catch((err) => console.error("watch-job error:", err));

    return NextResponse.json({ run_id: runId, ok: true });
  } catch (err) {
    console.error("generate error:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
