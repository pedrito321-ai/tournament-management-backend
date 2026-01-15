import prisma from '@/libs/prisma';
import { CreateTournamentBody } from '@/types/tournament.types';

interface CreateTournamentDTO extends CreateTournamentBody {
  created_by: number;
  judge_user_id: number;
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
  judge_user_id,
  allowed_club_ids,
  combat_duration_sec,
  created_by,
}: CreateTournamentDTO) => {
  return await prisma.$transaction(async (tx) => {
    // Resolver el juez REAL
    const judge = await tx.judges.findFirst({
      where: { user_id: judge_user_id },
      select: { id: true },
    });

    if (!judge) {
      throw new Error(`No existe un juez asociado al usuario ${judge_user_id}`);
    }

    const clubIds = allowed_club_ids.filter(
      (id): id is number => typeof id === 'number'
    );

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
        tournamentClubs: {
          create: clubIds.map((club_id) => ({
            club: {
              connect: { id: club_id },
            },
          })),
        },
      },
    });

    // Asociar el juez al torneo
    await tx.tournament_judges.create({
      data: {
        tournament_id: tournament.id,
        judge_id: judge.id,
      },
    });

    return {
      ...tournament,
      judge_id: judge.id,
      allowed_club_ids: clubIds,
      combat_duration_sec: combat_duration_sec ?? 1800,
    };
  });
};
