import { InferType } from 'yup';
import { joinTournamentSchema } from '@/schemas/registration.schema';

/**
 * Tipo para inscribirse a un torneo (inferido de Yup)
 */
export type JoinTournamentBody = InferType<typeof joinTournamentSchema>;
