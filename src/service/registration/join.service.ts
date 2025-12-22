import prisma from '@/libs/prisma';
import { JoinTournamentBody } from '@/types/registration.types';

interface JoinTournamentDTO extends JoinTournamentBody {
  competitor_id: number;
  club_id: number;
  category_id: number;
}

/**
 * Inscribe a un competidor en un torneo
 */
export const joinTournament = async ({
  tournament_id,
  robot_id,
  competitor_id,
  club_id,
  category_id,
}: JoinTournamentDTO) => {
  return await prisma.$transaction(async (tx) => {
    // Crear la inscripción
    const registration = await tx.tournament_registrations.create({
      data: {
        tournament_id,
        competitor_id,
        club_id,
        robot_id,
        category_id,
        validation_status: 'pending',
        is_approved: false,
      },
      include: {
        tournaments: {
          select: { id: true, name: true },
        },
        competitors: {
          include: {
            user: {
              select: { id: true, name: true, lastName: true },
            },
          },
        },
        robots: {
          select: { id: true, name: true },
        },
        club: {
          select: { id: true, name: true },
        },
      },
    });

    return registration;
  });
};
