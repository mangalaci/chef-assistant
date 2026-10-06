import { tool } from 'ai';
import { z } from 'zod';

import {
  filterRecipes,
  getRecipe,
  listRecipeCatalog,
  searchRecipes,
} from '@/lib/ai/search';

const CATEGORIES = [
  'main_dish', 'side_dish', 'sauce_condiment', 'bread_dough',
  'soup', 'salad', 'drink', 'other',
] as const;

const filterFields = {
  vegetarian: z.boolean().optional().describe('true: only recipes without meat or fish'),
  category: z.enum(CATEGORIES).optional().describe(
    'dish category; a rough guess from the file name, many main dishes are side_dish or other',
  ),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional().describe('by number of steps: easy <= 3, medium <= 7'),
  maxPrepMinutes: z.number().int().positive().optional().describe(
    'maximum preparation time in minutes; recipes without time information are excluded',
  ),
};

export const tools = {
  searchRecipes: tool({
    description: `Semantic search in the recipe collection. The recipes are in ENGLISH:
always write the query in English, even if the user asks in Hungarian
(e.g. "csirkemell" -> "chicken breast"). Returns the best matching recipe
sections with their recipe name. An empty result means nothing relevant.
Only set the filters the user explicitly asked for; every extra filter
removes recipes.`,
    inputSchema: z.object({
      query: z.string().min(2).describe('search query in English'),
      sectionTypes: z
        .array(z.enum(['ingredients', 'steps', 'notes', 'text']))
        .optional()
        .describe(
          'only for "what can I make from X" (["ingredients"]); otherwise leave empty to search all sections',
        ),
      ...filterFields,
    }),
    execute: async ({ query, ...options }) => {
      const result = await searchRecipes(query, options);
      return {
        results: result.hits,
        note: result.hits.length === 0 ? 'No relevant recipe found.' : undefined,
      };
    },
  }),

  filterRecipes: tool({
    description: `List recipes by metadata only (no semantic search). Use it for
exact conditions: vegetarian, category, difficulty, maximum preparation time.
For example "quick dinner" -> maxPrepMinutes 30 and category main_dish.`,
    inputSchema: z.object({
      ...filterFields,
      limit: z.number().int().min(1).max(100).optional(),
    }),
    execute: async ({ limit, ...filters }) => filterRecipes(filters, limit ?? 60),
  }),

  getRecipe: tool({
    description: `Return one complete recipe (all ingredients with quantities and
all steps) by its exact name or file name. Use it before giving quantities or
step-by-step instructions.`,
    inputSchema: z.object({
      name: z.string().min(2).describe('recipe name or file name, e.g. "Beef Tacos" or "beef-tacos.md"'),
    }),
    execute: async ({ name }) => getRecipe(name),
  }),

  listRecipeCatalog: tool({
    description: `List the names of all recipes in the collection, grouped by
category. Use it when the user asks what is available, or to check whether a
dish exists at all before saying it does not.`,
    inputSchema: z.object({}),
    execute: async () => listRecipeCatalog(),
  }),
};
