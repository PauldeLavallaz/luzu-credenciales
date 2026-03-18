import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("photo") as File;
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

    const blob = await put(`luzu-uploads/${Date.now()}-${file.name}`, file, {
      access: "public",
    });

    return NextResponse.json({ url: blob.url, path: blob.pathname });
  } catch (err) {
    console.error("upload error:", err);
    return NextResponse.json({ error: "Error subiendo la foto" }, { status: 500 });
  }
}
