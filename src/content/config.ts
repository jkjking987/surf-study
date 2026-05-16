import { defineCollection, z } from 'astro:content';

// ============================================================
// Bali Collection — 50 entries (spots, services, practical)
// ============================================================
const baliCollection = defineCollection({
  type: 'data',
  schema: z.object({
    // Top-level fields (some entries are flat, some nested)
    name: z.string().optional(),
    category: z.string().optional(),
    region: z.string().optional(),

    // Nested sections
    basic_info: z.record(z.any()).optional(),
    surf_conditions: z.record(z.any()).optional(),
    practical_info: z.record(z.any()).optional(),
    safety_culture: z.record(z.any()).optional(),
    services: z.record(z.any()).optional(),
    pricing: z.record(z.any()).optional(),
    sustainability: z.record(z.any()).optional(),
    events_community: z.record(z.any()).optional(),

    // Uncertainty tracking
    uncertain: z.array(z.string()).default([]),
  }).passthrough(),  // Allow extra top-level keys for flat entries
});

// ============================================================
// Hainan Collection — 21 entries (wave pools, spots, schools)
// ============================================================
const hainanCollection = defineCollection({
  type: 'data',
  schema: z.object({
    basic_info: z.object({
      name: z.string(),
      location: z.string().optional(),
      operator: z.string().optional(),
      opening_date: z.string().optional(),
      status: z.string(),
      category: z.string(),
    }),
    technical_specs: z.record(z.any()).optional(),
    pricing_sessions: z.record(z.any()).optional(),
    experience_guide: z.record(z.any()).optional(),
    surroundings: z.record(z.any()).optional(),
    reviews_reputation: z.record(z.any()).optional(),
    verification: z.record(z.any()).optional(),
    uncertain: z.array(z.string()).default([]),
  }).passthrough(),
});

// ============================================================
// Boards Collection — 33 entries (A/B/C/D/E groups)
// ============================================================
const boardsCollection = defineCollection({
  type: 'data',
  schema: z.object({
    id: z.string().optional(),
    basic_info: z.object({
      '名稱': z.string(),
      '分類': z.string().optional(),
      '適用程度': z.string().optional(),
      '一句話定位': z.string().optional(),
    }),
    buoyancy_strategy: z.record(z.any()).optional(),
    shape_details: z.record(z.any()).optional(),
    fin_setup: z.record(z.any()).optional(),
    construction: z.record(z.any()).optional(),
    conditions_fit: z.record(z.any()).optional(),
    performance: z.record(z.any()).optional(),
    practical_selection: z.record(z.any()).optional(),
    pro_reference: z.record(z.any()).optional(),
    local_taiwan_context: z.record(z.any()).optional(),
    uncertain: z.array(z.string()).default([]),
  }).passthrough(),
});

export const collections = {
  bali: baliCollection,
  hainan: hainanCollection,
  boards: boardsCollection,
};
