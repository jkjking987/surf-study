import { defineDb, defineTable, column } from 'astro:db';

export const BaliSpots = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    name: column.text(),
    category: column.text({ optional: true }),
    region: column.text({ optional: true }),
    // Store all the rich nested information (basic_info, surf_conditions, etc)
    content: column.json({ optional: true }),
  }
});

export const HainanSpots = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    name: column.text(),
    category: column.text({ optional: true }),
    status: column.text({ optional: true }),
    // Store technical_specs, pricing_sessions, etc
    content: column.json({ optional: true }),
  }
});

export const Boards = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    name: column.text(),
    group: column.text({ optional: true }), // e.g., 'A', 'B' derived from ID or content
    fit: column.text({ optional: true }), // 適用程度
    // Store buoyancy_strategy, shape_details, etc
    content: column.json({ optional: true }),
  }
});

export default defineDb({
  tables: {
    BaliSpots,
    HainanSpots,
    Boards,
  }
});
