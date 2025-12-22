import { object, number } from 'yup';

/**
 * Schema para inscribirse a un torneo (solo competitor)
 */
export const joinTournamentSchema = object({
  tournament_id: number()
    .required('El ID del torneo es obligatorio.')
    .positive('El ID del torneo debe ser positivo.')
    .integer('El ID del torneo debe ser un número entero.'),

  robot_id: number()
    .required('El ID del robot es obligatorio.')
    .positive('El ID del robot debe ser positivo.')
    .integer('El ID del robot debe ser un número entero.'),
});
