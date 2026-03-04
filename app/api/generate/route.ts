import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

const COMFY_KEY = process.env.COMFY_DEPLOY_API_KEY!;
const DEPLOYMENT_ID = "119b844e-869f-40cb-9f74-8f8e9b2b9086";

// Fixed values for this campaign — only "personaje" changes per user
const LUZU_LOGO = "https://skills.morfeolabs.com/static/luzu-logo.jpg";
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

    // Upload photo to Vercel Blob → get public URL
    const blob = await put(`luzu-submissions/${Date.now()}-${photo.name}`, photo, {
      access: "public",
    });

    const personajeUrl = blob.url;

    // Call ComfyDeploy
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
      return NextResponse.json(
        { error: "Error al iniciar la generación" },
        { status: 500 }
      );
    }

    const comfyData = await comfyRes.json();
    const runId = comfyData.run_id;

    // Log lead data (server-side)
    console.log(`[LEAD] name=${name} email=${email} run_id=${runId} ts=${new Date().toISOString()}`);

    return NextResponse.json({ run_id: runId, ok: true });
  } catch (err) {
    console.error("generate error:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
