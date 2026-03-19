import { NextRequest, NextResponse } from "next/server";
import { saveCredencial } from "@/app/lib/supabase";

const COMFY_KEY = process.env.COMFY_DEPLOY_API_KEY!;
const DEPLOYMENT_ID = "119b844e-869f-40cb-9f74-8f8e9b2b9086";

export async function POST(req: NextRequest) {
  try {
    const { photoUrl, name, email, selectorEstilo, productSelector } = await req.json();

    if (!photoUrl || !name || !email || !selectorEstilo || !productSelector) {
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
            product_selector: productSelector,
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
    console.log(`[LEAD] name="${name}" email="${email}" estilo=${selectorEstilo} product=${productSelector} run_id=${runId}`);

    // Save to Supabase (fire-and-forget, credential_url added later via status polling)
    saveCredencial({
      name, email, estilo: selectorEstilo, producto: productSelector,
      photo_url: photoUrl, credential_url: null, source: "v1",
    }).catch(() => {});

    return NextResponse.json({ run_id: runId, ok: true });
  } catch (err) {
    console.error("generate error:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
