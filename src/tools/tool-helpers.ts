import { z } from 'zod';

export const requestBaseSchema = {
  cookie: z.string().optional(),
  proxy: z.string().optional(),
  realIP: z.string().optional(),
  randomCNIP: z.boolean().optional(),
};

export const idSchema = z.union([z.string(), z.number()]);

export const paginationSchema = {
  limit: z.number().int().min(1).max(1000).default(30),
  offset: z.number().int().min(0).default(0),
};

export const commentPaginationSchema = {
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
  before: z.union([z.string(), z.number()]).optional(),
};

export const commaSeparatedIdsSchema = z
  .union([z.string().trim().min(1), z.array(idSchema).min(1)])
  .transform((value) => (Array.isArray(value) ? value.join(',') : value));
