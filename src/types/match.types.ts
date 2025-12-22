import { InferType } from 'yup';
import { setMatchResultSchema } from '@/schemas/match.schema';

/**
 * Tipo para registrar resultado de combate (inferido de Yup)
 */
export type SetMatchResultBody = InferType<typeof setMatchResultSchema>;
