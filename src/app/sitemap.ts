import type { MetadataRoute } from "next";

// Static routes — dynamic venue/city routes will be added once DB is populated
export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://focusbythecousin.com";

  return [
    {
      url: base,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
