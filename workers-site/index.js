import implicitRenderHtml from "./implicit.html";
import { getAssetFromKV } from "@cloudflare/kv-asset-handler";
import manifestJSON from "__STATIC_CONTENT_MANIFEST";
const assetManifest = JSON.parse(manifestJSON);

async function handlePost(request, env, ctx) {
  try {
    const body = await request.formData();
    // Turnstile injects a token in "cf-turnstile-response".
    const token = body.get("cf-turnstile-response");
    const ip = request.headers.get("CF-Connecting-IP");

    // Validate the token by calling the "/siteverify" API.
    let formData = new FormData();
    formData.append("secret", env.TURNSTILE_SECRET);
    formData.append("response", token);
    formData.append("remoteip", ip);

    const result = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        body: formData,
        method: "POST",
      }
    );

    const outcome = await result.json();
    if (!outcome.success) {
      throw new Error();
    }
  
    // The Turnstile token was successfuly validated. Proceed with your application logic.
    return await getAssetFromKV(
      {
        request: new Request(request.url, {
          method: "GET",
        }),
        waitUntil: ctx.waitUntil.bind(ctx),
      },
      {
        ASSET_NAMESPACE: env.__STATIC_CONTENT,
        ASSET_MANIFEST: assetManifest,
      }
    );
  } catch (e) {
    console.log(e);
    return new Response(`Not available!`, {
      status: 404,
      statusText: "not found",
    });
  }
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === "POST") {
      return await handlePost(request, env, ctx);
    }

    return new Response(implicitRenderHtml, {
      headers: {
        "Content-Type": "text/html",
      },
    });
  },
};
