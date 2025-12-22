import prisma from '@/libs/prisma';
import { CreateTournamentBody } from '@/types/tournament.types';

interface CreateTournamentDTO extends CreateTournamentBody {
  created_by: number;
}

/**
 * Crea un nuevo torneo con estado draft
 * - Asocia el juez al torneo
 * - Guarda los clubes habilitados como metadata
 */
export const createTournament = async ({
  name,
  description,
  category_id,
  max_participants,
  start_date,
  end_date,
  judge_id,
  allowed_club_ids,
  combat_duration_sec,
  created_by,
}: CreateTournamentDTO) => {
  return await prisma.$transaction(async (tx) => {
    // Crear el torneo en estado draft
    const tournament = await tx.tournaments.create({
      data: {
        name,
        description,
        category_id,
        max_participants,
        start_date,
        end_date,
        status: 'draft',
        created_by,
      },
    });

    // Asociar el juez al torneo
    await tx.tournament_judges.create({
      data: {
        tournament_id: tournament.id,
        judge_id,
      },
    });

    return {
      ...tournament,
      judge_id,
      allowed_club_ids,
      combat_duration_sec: combat_duration_sec ?? 1800,
    };
  });
};
