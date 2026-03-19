import { createClient } from "@supabase/supabase-js";

function getClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
}

export async function saveCredencial(data: {
  name: string;
  email: string;
  estilo: number;
  producto: number;
  photo_url: string;
  credential_url: string | null;
  source: string;
}) {
  const { error } = await getClient().from("credenciales").insert(data);
  if (error) console.error("Supabase insert error:", error);
}
