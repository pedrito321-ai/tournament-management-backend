import prisma from '@/libs/prisma';
import { UpdateTournamentBody } from '@/types/tournament.types';

interface UpdateTournamentDTO extends UpdateTournamentBody {
  tournamentId: number;
}

/**
 * Actualiza un torneo existente
 * Solo se pueden modificar torneos en estado draft (excepto cambios de estado)
 */
export const updateTournament = async ({
  tournamentId,
  name,
  description,
  max_participants,
  start_date,
  end_date,
  status,
  combat_duration_sec,
}: UpdateTournamentDTO) => {
  const tournament = await prisma.tournaments.update({
    where: { id: tournamentId },
    data: {
      ...(name && { name }),
      ...(description !== undefined && { description }),
      ...(max_participants && { max_participants }),
      ...(start_date !== undefined && { start_date }),
      ...(end_date !== undefined && { end_date }),
      ...(status && { status }),
      ...(combat_duration_sec !== undefined && { combat_duration_sec }),
    },
    include: {
      category: {
        select: { id: true, name: true },
      },
    },
  });

  return tournament;
};

/**
 * Cancela un torneo (cambia estado a cancelled)
 */
export const cancelTournament = async (tournamentId: number) => {
  const tournament = await prisma.tournaments.update({
    where: { id: tournamentId },
    data: { status: 'cancelled' },
  });

  return tournament;
};
