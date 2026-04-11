/**
 * Astro 6 Content Layer configuration.
 *
 * Only `localGuide` is queried via getCollection().
 * hostel-info / events / camino-guide JSON data files are imported
 * directly in pages with a regular `import` — no collection needed.
 */
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// ---------------------------------------------------------------------------
// Local-guide collection
// Markdown files for restaurants, attractions and activities.
// JSON files in the same folder (directions, local-services) are imported
// directly in pages and are NOT part of this collection.
// ---------------------------------------------------------------------------
const localGuide = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/local-guide' }),
  schema: z.object({
    id: z.string(),
    type: z.enum(['restaurant', 'attraction', 'activity', 'local-service', 'direction']),
    name: z.string(),
    emoji: z.string().optional(),
    icon: z.string().optional(),
    category: z.string().optional(),
    distance: z.string().optional(),
    walkTime: z.string().optional(),
    hours: z.string().optional(),
    priceRange: z.string().optional(),
    stars: z.number().optional(),
    pilgrimMenu: z.boolean().default(false),
    tags: z.array(z.string()).default([]),
    mustSee: z.boolean().default(false),
    difficulty: z.string().optional(),
    duration: z.string().optional(),
    color: z.string().optional(),
    phone: z.string().optional(),
    order: z.number().default(0),
  }),
});

export const collections = { localGuide };
