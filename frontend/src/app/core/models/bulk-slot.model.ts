import { z } from "zod";

export const bulkSlotSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  startTime: z.string(),
  duration: z.number().min(1),
  quantity: z.number().min(1),
});

export type BulkSlot = z.infer<typeof bulkSlotSchema>;