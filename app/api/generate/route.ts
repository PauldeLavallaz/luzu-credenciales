import { NextRequest, NextResponse } from "next/server";

const COMFY_KEY = process.env.COMFY_DEPLOY_API_KEY!;
const DEPLOYMENT_ID = "119b844e-869f-40cb-9f74-8f8e9b2b9086";

export async function POST(req: NextRequest) {
  try {
    const { photoUrl, name, selectorEstilo } = await req.json();

    if (!photoUrl || !name || !selectorEstilo) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
    }

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
          inputs: {
            personaje: photoUrl,
            selector_estilo: selectorEstilo,
            input_seed: -1,
          },
        }),
      }
    );

    if (!comfyRes.ok) {
      const errText = await comfyRes.text();
      console.error("ComfyDeploy error:", errText);
      return NextResponse.json({ error: "Error al iniciar la generación" }, { status: 500 });
    }

    const { run_id: runId } = await comfyRes.json();
    console.log(`[LEAD] name="${name}" estilo=${selectorEstilo} run_id=${runId}`);

    return NextResponse.json({ run_id: runId, ok: true });
  } catch (err) {
    console.error("generate error:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
