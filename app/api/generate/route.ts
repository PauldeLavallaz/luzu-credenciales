import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

export const maxDuration = 120;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const GEMINI_MODEL = "gemini-2.0-flash-exp";

const STYLE_PROMPTS: Record<number, string> = {
  1: `Mixed media collage artwork combining a real photograph cutout of the person with hand-drawn illustrated elements, doodles, cartoon stickers, colorful paper textures, and graphic overlays in the LUZU TV visual language. The person is the central focus, holding a LUZU! branded tumbler cup with colorful stickers. The background is a dynamic collage of torn paper pieces, magazine cutouts, hand-drawn streaming elements (microphones, screens, headphones), stars, arrows, and playful LUZU-style cartoon elements (cute dog, eyes, flags, abstract colorful shapes). Bold palette: blacks, whites, bright blues, pinks, greens, and oranges matching LUZU branding. Gen Z / TikTok scrapbook aesthetic, fun, chaotic-but-cohesive, youth-oriented. The product must be clearly visible.`,
  2: `3D cartoon Pixar-style rendering for LUZU TV brand activation. Transform the person into a stylized 3D animated character with exaggerated proportions, smooth skin textures, and expressive cartoon eyes, maintaining their recognizable facial features and hairstyle. The character is holding the black LUZU! branded tumbler cup with colorful stickers at chest level with a big cheerful smile. The setting is a 3D rendered version of the LUZU TV streaming studio with cartoon-style LED panels, oversized microphones, colorful monitors, and playful LUZU branding elements floating around. Bright, saturated Pixar-quality lighting with soft ambient occlusion. The overall aesthetic is fun, polished, and toylike. Product must be clearly visible and prominent.`,
  3: `Bold Pop Art style artwork for LUZU TV brand activation inspired by Andy Warhol and Roy Lichtenstein. The person is depicted in high-contrast halftone dot pattern with bold black outlines and flat areas of vivid saturated color. They are holding the black LUZU! branded tumbler cup with colorful stickers at chest level. The background features graphic pop art elements: bold color blocks, comic book speech bubbles, Ben-Day dots, starburst shapes, and LUZU branding elements rendered in pop art style. Primary colors with neon accents: hot pink, electric blue, bright yellow, orange, black and white. The overall feel is bold, eye-catching, shareable, and gallery-worthy. Product must be clearly visible and prominent.`,
};

export async function POST(req: NextRequest) {
  try {
    const { photoUrl, name, email, selectorEstilo } = await req.json();

    if (!photoUrl || !name || !email || !selectorEstilo) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
    }

    console.log(`[LEAD] name="${name}" email="${email}" estilo=${selectorEstilo}`);

    // 1. Download user photo and convert to base64
    const photoRes = await fetch(photoUrl);
    if (!photoRes.ok) throw new Error("No se pudo descargar la foto");
    const photoBuffer = await photoRes.arrayBuffer();
    const photoBase64 = Buffer.from(photoBuffer).toString("base64");
    const mimeType = photoRes.headers.get("content-type") || "image/jpeg";

    // 2. Select style prompt
    const prompt = STYLE_PROMPTS[selectorEstilo] || STYLE_PROMPTS[1];

    // 3. Call Gemini API
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inlineData: { mimeType, data: photoBase64 } },
            ],
          }],
          generationConfig: {
            responseModalities: ["IMAGE", "TEXT"],
            temperature: 0.95,
          },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("Gemini API error:", errText);
      return NextResponse.json({ error: "Error en la generación de imagen" }, { status: 500 });
    }

    const geminiData = await geminiRes.json();
    const candidates = geminiData.candidates;
    if (!candidates?.[0]?.content?.parts) {
      console.error("Gemini response sin candidatos:", JSON.stringify(geminiData).slice(0, 500));
      return NextResponse.json({ error: "La generación no produjo resultados" }, { status: 500 });
    }

    // 4. Extract generated image
    const imagePart = candidates[0].content.parts.find(
      (p: { inlineData?: { mimeType: string; data: string } }) => p.inlineData
    );
    if (!imagePart?.inlineData) {
      console.error("Gemini response sin imagen:", JSON.stringify(geminiData).slice(0, 500));
      return NextResponse.json({ error: "La generación no produjo una imagen" }, { status: 500 });
    }

    const imageBase64 = imagePart.inlineData.data;
    const imageMime = imagePart.inlineData.mimeType || "image/png";

    // 5. Upload to Vercel Blob
    const imageBuffer = Buffer.from(imageBase64, "base64");
    const ext = imageMime.includes("png") ? "png" : "jpg";
    const blob = await put(`credenciales/${Date.now()}-${name.replace(/\s+/g, "-")}.${ext}`, imageBuffer, {
      access: "public",
      contentType: imageMime,
    });

    console.log(`[DONE] name="${name}" imageUrl=${blob.url}`);

    return NextResponse.json({ imageUrl: blob.url });
  } catch (err) {
    console.error("generate error:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
