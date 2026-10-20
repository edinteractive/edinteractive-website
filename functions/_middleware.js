// buyer.edinteractive.digital (and buyerpersona.) shows the buyer persona builder at its root.
// _routes.json limits Functions to "/" and "/api/*", so this runs only there; every other path is static.
export async function onRequest({ request, next, env }) {
  const url = new URL(request.url);
  if (/^(buyer|buyerpersona)\./.test(url.hostname) && url.pathname === '/') {
    return env.ASSETS.fetch(new Request(new URL('/buyer-persona/', url), request));
  }
  return next();
}
