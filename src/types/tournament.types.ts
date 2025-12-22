import { InferType } from 'yup';
import {
  createTournamentSchema,
  updateTournamentSchema,
} from '@/schemas/tournament.schema';

/**
 * Tipo para crear un torneo (inferido de Yup)
 */
export type CreateTournamentBody = InferType<typeof createTournamentSchema>;

/**
 * Tipo para actualizar un torneo (inferido de Yup)
 */
export type UpdateTournamentBody = InferType<typeof updateTournamentSchema>;
