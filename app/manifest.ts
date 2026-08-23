import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TTLog",
    short_name: "TTLog",
    description: "Tafeltenniswedstrijd-logboek voor je seizoensstatistieken.",
    start_url: "/",
    display: "standalone",
    background_color: "#fffcfb",
    theme_color: "#093fb4",
    lang: "nl-BE",
    icons: [
      {
        src: "/logo-ttlog.jpg?v=2",
        sizes: "1024x1024",
        type: "image/jpeg",
        purpose: "any",
      },
      {
        src: "/logo-ttlog.jpg?v=2",
        sizes: "1024x1024",
        type: "image/jpeg",
        purpose: "maskable",
      },
    ],
  };
}
