import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Gooqi Scribe",
    short_name: "Gooqi",
    description: "Your AI-powered medical documentation assistant",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0f172a", // slate-900
    theme_color: "#0f172a",
    icons: [
      {
        src: "/api/icon-192",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable"
      },
      {
        src: "/api/icon-512",
        sizes: "512x512",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
    screenshots: [
      {
        src: "/screenshot-desktop.svg.png",
        sizes: "1280x720",
        type: "image/png",
        // @ts-ignore - Some TS types for MetadataRoute.Manifest might be outdated
        form_factor: "wide"
      },
      {
        src: "/screenshot-mobile.svg.png",
        sizes: "720x1280",
        type: "image/png",
        // @ts-ignore
        form_factor: "narrow"
      }
    ]
  };
}
