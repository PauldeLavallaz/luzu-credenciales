import { NextRequest, NextResponse } from "next/server";

const COMFY_KEY = process.env.COMFY_DEPLOY_API_KEY!;
const UPLOAD_ENDPOINT = "https://skills.morfeolabs.com/upload/photo";
const DEPLOYMENT_ID = "119b844e-869f-40cb-9f74-8f8e9b2b9086";
const LUZU_LOGO = "https://skills.morfeolabs.com/static/luzu-logo.jpg";

// Fixed inputs — only "personaje" varies per user
const FIXED_INPUTS = {
  brief: " ",
  target: "",
  input_seed: -1,
  branding_pack: "logo_none",
  aspect_ratio: "3:4",
  logo: LUZU_LOGO,
  style_pack: "street_authentic",
  camera_pack: "sony_a1",
  lens_pack: "zeiss_otus_55",
  product: "",
};

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const photo = formData.get("photo") as File | null;
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;

    if (!photo || !name || !email) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
    }

    // 1. Upload photo to skills.morfeolabs.com → get public URL
    const uploadForm = new FormData();
    uploadForm.append("photo", photo);

    const uploadRes = await fetch(UPLOAD_ENDPOINT, {
      method: "POST",
      body: uploadForm,
    });

    if (!uploadRes.ok) {
      console.error("Upload failed:", await uploadRes.text());
      return NextResponse.json({ error: "Error al subir la foto" }, { status: 500 });
    }

    const { url: personajeUrl } = await uploadRes.json();

    // 2. Launch ComfyDeploy run
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
            ...FIXED_INPUTS,
            personaje: personajeUrl,
          },
        }),
      }
    );

    if (!comfyRes.ok) {
      const errText = await comfyRes.text();
      console.error("ComfyDeploy error:", errText);
      return NextResponse.json({ error: "Error al iniciar la generación" }, { status: 500 });
    }

    const comfyData = await comfyRes.json();
    const runId = comfyData.run_id;

    // Log lead (server-side only)
    console.log(`[LEAD] name="${name}" email="${email}" run_id=${runId} ts=${new Date().toISOString()}`);

    return NextResponse.json({ run_id: runId, ok: true });
  } catch (err) {
    console.error("generate error:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
