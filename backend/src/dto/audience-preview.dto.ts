import { z } from 'zod';
import { EVENT_TYPES } from '../models/event.model.js';

// ---------- Request ----------

const conditionSchema = z.object({
    eventType: z.enum(EVENT_TYPES),
    operator: z.enum(['at_least', 'exactly']),
    count: z.number().int().min(0),
    withinDays: z.number().int().min(1).max(365),
});

export const audiencePreviewSchema = z.object({
    name: z.string().trim().min(1).max(100),
    asOf: z.iso.datetime(), // e.g. "2026-09-29T00:00:00.000Z"
    conditions: z.array(conditionSchema).min(1).max(10),
});

export type Condition = z.infer<typeof conditionSchema>;
export type AudiencePreviewRequest = z.infer<typeof audiencePreviewSchema>;

// ---------- Response ----------

export interface Evidence {
    eventType: string;
    observedCount: number;
}

export interface AudienceMember {
    anonymousId: string;
    evidence: Evidence[];
}

export interface AudiencePreviewResponse {
    name: string;
    asOf: string;
    total: number;
    members: AudienceMember[];
}
