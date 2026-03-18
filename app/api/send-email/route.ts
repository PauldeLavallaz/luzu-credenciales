import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(req: NextRequest) {
  try {
    const { email, name, imageUrl } = await req.json();
    const resend = new Resend(process.env.RESEND_API_KEY);

    if (!email || !name || !imageUrl) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
    }

    await resend.emails.send({
      from: "Luzu Credenciales <credenciales@marketing.morfeolabs.com>",
      to: email,
      subject: `${name}, tu credencial Luzu está lista! 🎉`,
      html: `
        <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #0D0D0D; border-radius: 16px; overflow: hidden;">
          <div style="padding: 32px 24px 16px; text-align: center;">
            <h1 style="color: #F9B928; font-size: 28px; margin: 0 0 8px;">¡Tu credencial Luzu está lista!</h1>
            <p style="color: #FAFAF8; opacity: 0.7; font-size: 16px; margin: 0;">Hola ${name}, acá tenés tu credencial exclusiva 🪄</p>
          </div>
          <div style="padding: 0 24px 24px; text-align: center;">
            <img src="${imageUrl}" alt="Tu credencial Luzu" style="width: 100%; border-radius: 12px; border: 3px solid #00D5C8;" />
            <a href="${imageUrl}" download="mi-credencial-luzu.jpg"
              style="display: inline-block; margin-top: 20px; padding: 14px 32px; background: #F9B928; color: #0D0D0D; font-weight: 700; font-size: 16px; border-radius: 12px; text-decoration: none;">
              ⬇️ Descargar credencial
            </a>
          </div>
          <div style="padding: 16px 24px; text-align: center; border-top: 1px solid rgba(255,255,255,0.1);">
            <p style="color: #FAFAF8; opacity: 0.3; font-size: 12px; margin: 0;">Luzu TV · credenciales.luzu.tv</p>
          </div>
        </div>
      `,
    });

    console.log(`[EMAIL] sent to="${email}" name="${name}"`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("send-email error:", err);
    return NextResponse.json({ error: "Error al enviar email" }, { status: 500 });
  }
}
