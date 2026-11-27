export async function normalizeImageNode(): Promise<Uint8Array> {
  throw new Error(
    "Native Node.js image codecs are not bundled in Cloudflare Workers. Use the IMAGES binding.",
  );
}
