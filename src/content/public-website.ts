export type PublicWebsite = { url: string | null; verified: boolean };

// Bevestiging is een beheerbeslissing na de online eindcontrole, geen automatische aanname.
export function verifiedPublicUrl(website: PublicWebsite): string | null {
  if (!website.verified || !website.url) return null;
  try {
    const url = new URL(website.url);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:" || url.username || url.password || url.port)
      return null;
    if (
      !/\.[a-z]{2,}$/.test(host) ||
      /\.(localhost|local|test|invalid)$/.test(host)
    )
      return null;
    if (host.endsWith(".trycloudflare.com") || host.endsWith(".ngrok-free.app"))
      return null;
    return url.href;
  } catch {
    return null;
  }
}
