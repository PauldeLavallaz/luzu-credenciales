import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

export const maxDuration = 120;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const GEMINI_MODEL = "gemini-3-pro-image-preview";

// Product reference image URLs (hosted on Vercel Blob)
const PRODUCT_IMAGES: Record<number, string> = {
  1: "https://acnsxsd2sgycmxbr.public.blob.vercel-storage.com/products/mercado-libre.jpeg",
  2: "https://acnsxsd2sgycmxbr.public.blob.vercel-storage.com/products/cif.jpeg",
  3: "https://acnsxsd2sgycmxbr.public.blob.vercel-storage.com/products/luzu-tumbler.jpeg",
  4: "https://acnsxsd2sgycmxbr.public.blob.vercel-storage.com/products/honor-x7d.jpeg",
};

// Luzu studio photo — used only for Pixar style
const STUDIO_IMAGE = "https://acnsxsd2sgycmxbr.public.blob.vercel-storage.com/products/luzu-studio.jpeg";

const PRODUCTS: Record<number, string> = {
  1: "a Mercado Libre branded yellow shipping package (as shown in the product reference image)",
  2: "a CIF Bioactive Crema Multiuso bottle (as shown in the product reference image)",
  3: "a LUZU TV Shop branded tumbler cup with colorful stickers (as shown in the product reference image)",
  4: "a Honor X7d smartphone (as shown in the product reference image)",
};

const STYLE_PROMPTS: Record<number, string> = {
  1: `Mixed media collage artwork combining a real photograph cutout of the person with hand-drawn illustrated elements, doodles, cartoon stickers, colorful paper textures, and graphic overlays in the LUZU TV visual language. The person is the central focus, holding {{PRODUCT}}. The background is a dynamic collage of torn paper pieces, magazine cutouts, hand-drawn streaming elements (microphones, screens, headphones), stars, arrows, and playful LUZU-style cartoon elements (cute dog, eyes, flags, abstract colorful shapes). Bold palette: blacks, whites, bright blues, pinks, greens, and oranges matching LUZU branding. Gen Z / TikTok scrapbook aesthetic, fun, chaotic-but-cohesive, youth-oriented. The product must be clearly visible and match the reference exactly.`,
  2: `3D cartoon Pixar-style rendering for LUZU TV brand activation. Transform the person into a stylized 3D animated character with exaggerated proportions, smooth skin textures, and expressive cartoon eyes, maintaining their recognizable facial features and hairstyle. The character is holding {{PRODUCT}} at chest level with a big cheerful smile. The setting must be a 3D Pixar-style rendered version of the LUZU TV streaming studio shown in the studio reference image — with the same desk, microphones, LED panels, and LUZU! TV branding on the walls, but rendered in a fun cartoon style. Bright, saturated Pixar-quality lighting with soft ambient occlusion. The overall aesthetic is fun, polished, and toylike. Product must be clearly visible, prominent, and match the reference exactly.`,
  3: `Bold Pop Art style artwork for LUZU TV brand activation inspired by Andy Warhol and Roy Lichtenstein. The person is depicted in high-contrast halftone dot pattern with bold black outlines and flat areas of vivid saturated color. They are holding {{PRODUCT}} at chest level. The background features graphic pop art elements: bold color blocks, comic book speech bubbles, Ben-Day dots, starburst shapes, and LUZU branding elements rendered in pop art style. Primary colors with neon accents: hot pink, electric blue, bright yellow, orange, black and white. The overall feel is bold, eye-catching, shareable, and gallery-worthy. Product must be clearly visible, prominent, and match the reference exactly.`,
};

async function downloadAsBase64(url: string): Promise<{ data: string; mimeType: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download: ${url}`);
  const buffer = await res.arrayBuffer();
  return {
    data: Buffer.from(buffer).toString("base64"),
    mimeType: res.headers.get("content-type") || "image/jpeg",
  };
}

export async function POST(req: NextRequest) {
  try {
    const { photoUrl, name, email, selectorEstilo, productSelector } = await req.json();

    if (!photoUrl || !name || !email || !selectorEstilo || !productSelector) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
    }

    console.log(`[V2] name="${name}" email="${email}" estilo=${selectorEstilo} product=${productSelector}`);

    // 1. Download all images in parallel
    const [userPhoto, productPhoto, ...extraPhotos] = await Promise.all([
      downloadAsBase64(photoUrl),
      downloadAsBase64(PRODUCT_IMAGES[productSelector] || PRODUCT_IMAGES[3]),
      // Include studio image only for Pixar style
      ...(selectorEstilo === 2 ? [downloadAsBase64(STUDIO_IMAGE)] : []),
    ]);

    // 2. Build prompt
    const product = PRODUCTS[productSelector] || PRODUCTS[3];
    const promptTemplate = STYLE_PROMPTS[selectorEstilo] || STYLE_PROMPTS[1];
    const prompt = promptTemplate.replace("{{PRODUCT}}", product);

    // 3. Build parts array: prompt + person photo + product photo + (studio if Pixar)
    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
      { text: prompt },
      { text: "Person photo (use as the main subject):" },
      { inlineData: { mimeType: userPhoto.mimeType, data: userPhoto.data } },
      { text: "Product reference image (reproduce this product exactly):" },
      { inlineData: { mimeType: productPhoto.mimeType, data: productPhoto.data } },
    ];

    if (selectorEstilo === 2 && extraPhotos[0]) {
      parts.push(
        { text: "Studio reference image (use as setting reference for the Pixar 3D scene):" },
        { inlineData: { mimeType: extraPhotos[0].mimeType, data: extraPhotos[0].data } },
      );
    }

    // 4. Call Gemini API
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [{ parts }],
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
      console.error("Gemini sin candidatos:", JSON.stringify(geminiData).slice(0, 500));
      return NextResponse.json({ error: "La generación no produjo resultados" }, { status: 500 });
    }

    // 5. Extract generated image
    const imagePart = candidates[0].content.parts.find(
      (p: { inlineData?: { mimeType: string; data: string } }) => p.inlineData
    );
    if (!imagePart?.inlineData) {
      console.error("Gemini sin imagen:", JSON.stringify(geminiData).slice(0, 500));
      return NextResponse.json({ error: "La generación no produjo una imagen" }, { status: 500 });
    }

    // 6. Save to Vercel Blob
    const imageBuffer = Buffer.from(imagePart.inlineData.data, "base64");
    const imageMime = imagePart.inlineData.mimeType || "image/png";
    const ext = imageMime.includes("png") ? "png" : "jpg";
    const blob = await put(
      `credenciales-v2/${Date.now()}-${name.replace(/\s+/g, "-")}.${ext}`,
      imageBuffer,
      { access: "public", contentType: imageMime }
    );

    console.log(`[V2 DONE] name="${name}" imageUrl=${blob.url}`);

    return NextResponse.json({ imageUrl: blob.url });
  } catch (err) {
    console.error("v2 generate error:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
