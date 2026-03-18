import { NextRequest, NextResponse } from "next/server";

const COMFY_KEY = process.env.COMFY_DEPLOY_API_KEY!;
const DEPLOYMENT_ID = "119b844e-869f-40cb-9f74-8f8e9b2b9086";
const BASE_URL = "https://luzu-credenciales.vercel.app";
const LUZU_LOGO = `${BASE_URL}/luzu-logo.jpg`;
const LUZU_POTE = `${BASE_URL}/luzu-pote.jpg`;

export async function POST(req: NextRequest) {
  try {
    const { photoUrl, name, email } = await req.json();

    if (!photoUrl || !name || !email) {
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
            product: LUZU_POTE,
            logo: LUZU_LOGO,
            brief:
              "Mixed media collage artwork combining a real photograph cutout of the person with hand-drawn illustrated elements, doodles, cartoon stickers, colorful paper textures, and graphic overlays in the LUZU TV visual language. The person is the central focus, holding a LUZU! branded tumbler cup with colorful stickers. The background is a dynamic collage of torn paper pieces, magazine cutouts, hand-drawn streaming elements (microphones, screens, headphones), stars, arrows, and playful LUZU-style cartoon elements (cute dog, eyes, flags, abstract colorful shapes). Bold palette: blacks, whites, bright blues, pinks, greens, and oranges matching LUZU branding. Gen Z / TikTok scrapbook aesthetic, fun, chaotic-but-cohesive, youth-oriented. The product must be clearly visible.",
            target:
              "Young adults 18-35, digitally native, socially active consumers who follow LUZU TV content and streaming culture. They value authenticity, humor, community and relatability. Active on Instagram, TikTok and YouTube. Argentine youth culture enthusiasts.",
            input_seed: -1,
            branding_pack: "logo_none",
            aspect_ratio: "3:4",
            style_pack: "street_authentic",
            camera_pack: "sony_a1",
            lens_pack: "zeiss_otus_55",
            film_texture_pack: "digital_clean_no_emulation",
            color_science_pack: "warm_golden_editorial",
            shot_pack: "medium_shot",
            pose_discipline_pack: "commercial_front_facing",
            lighting_pack: "studio_three_point",
            time_weather_pack: "studio_controlled",
            environment_pack: "high_key_studio",
            intent: "auto",
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
    console.log(`[LEAD] name="${name}" email="${email}" run_id=${runId}`);

    return NextResponse.json({ run_id: runId, ok: true });
  } catch (err) {
    console.error("generate error:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
