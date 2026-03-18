import { put } from "@vercel/blob";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const COMFY_KEY = process.env.COMFY_DEPLOY_API_KEY;
const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
const DEPLOYMENT_ID = "119b844e-869f-40cb-9f74-8f8e9b2b9086";

const STYLES = [2, 3]; // Pixar, Pop Art
const PRODUCTS = [1, 2, 4]; // Mercado Libre, CIF, Honor

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const DIR = "/tmp/luzu-personajes/PERSONAJES LUZU";
const files = readdirSync(DIR).filter((f) => f.endsWith(".png") || f.endsWith(".jpg"));

console.log(`Found ${files.length} images. Launching batch...`);

const results = [];

for (let i = 0; i < files.length; i++) {
  const file = files[i];
  const filePath = join(DIR, file);
  const buffer = readFileSync(filePath);
  const style = pick(STYLES);
  const product = pick(PRODUCTS);

  try {
    // Upload to Vercel Blob
    const blob = await put(`batch/${Date.now()}-${i}.png`, buffer, {
      access: "public",
      contentType: "image/png",
      token: BLOB_TOKEN,
    });

    // Queue ComfyDeploy run
    const res = await fetch("https://api.comfydeploy.com/api/run/deployment/queue", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${COMFY_KEY}`,
      },
      body: JSON.stringify({
        deployment_id: DEPLOYMENT_ID,
        inputs: {
          personaje: blob.url,
          selector_estilo: style,
          product_selector: product,
          input_seed: -1,
        },
      }),
    });

    const data = await res.json();
    const runId = data.run_id;
    console.log(`[${i + 1}/${files.length}] ✓ style=${style} product=${product} run_id=${runId}`);
    results.push({ file, style, product, runId, blobUrl: blob.url });
  } catch (err) {
    console.error(`[${i + 1}/${files.length}] ✗ ${file}: ${err.message}`);
  }
}

console.log(`\nDone! ${results.length}/${files.length} jobs queued.`);
console.log(JSON.stringify(results, null, 2));
