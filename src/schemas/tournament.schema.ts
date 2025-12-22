import { object, string, number, array, date } from 'yup';
import { tournament_status } from '@prisma/client';

/**
 * Schema para crear un torneo (solo admin)
 */
export const createTournamentSchema = object({
  name: string()
    .required('El nombre del torneo es obligatorio.')
    .min(3, 'El nombre debe tener al menos 3 caracteres.')
    .max(255, 'El nombre no puede superar los 255 caracteres.'),

  description: string()
    .max(5000, 'La descripción no puede superar los 5000 caracteres.')
    .optional(),

  category_id: number()
    .required('La categoría es obligatoria.')
    .positive('El ID de categoría debe ser positivo.')
    .integer('El ID de categoría debe ser un número entero.'),

  max_participants: number()
    .required('El máximo de participantes es obligatorio.')
    .min(8, 'El mínimo de participantes es 8.')
    .max(16, 'El máximo de participantes es 16.')
    .integer('El número de participantes debe ser entero.')
    .test(
      'multiple-of-4',
      'El número de participantes debe ser múltiplo de 4.',
      (value) => value !== undefined && value % 4 === 0
    ),

  start_date: date()
    .nullable()
    .optional(),

  end_date: date()
    .nullable()
    .optional(),

  judge_id: number()
    .required('El juez es obligatorio.')
    .positive('El ID del juez debe ser positivo.')
    .integer('El ID del juez debe ser un número entero.'),

  allowed_club_ids: array()
    .of(
      number()
        .positive('Cada ID de club debe ser positivo.')
        .integer('Cada ID de club debe ser un número entero.')
    )
    .required('Los clubes habilitados son obligatorios.')
    .min(1, 'Debe habilitar al menos un club.'),

  combat_duration_sec: number()
    .positive('La duración del combate debe ser positiva.')
    .integer('La duración debe ser un número entero.')
    .default(1800), // 30 minutos por defecto
});

/**
 * Schema para actualizar un torneo
 */
export const updateTournamentSchema = object({
  name: string()
    .min(3, 'El nombre debe tener al menos 3 caracteres.')
    .max(255, 'El nombre no puede superar los 255 caracteres.')
    .optional(),

  description: string()
    .max(5000, 'La descripción no puede superar los 5000 caracteres.')
    .optional(),

  max_participants: number()
    .min(8, 'El mínimo de participantes es 8.')
    .max(16, 'El máximo de participantes es 16.')
    .integer('El número de participantes debe ser entero.')
    .test(
      'multiple-of-4',
      'El número de participantes debe ser múltiplo de 4.',
      (value) => value === undefined || value % 4 === 0
    )
    .optional(),

  start_date: date()
    .nullable()
    .optional(),

  end_date: date()
    .nullable()
    .optional(),

  status: string()
    .oneOf(
      Object.values(tournament_status),
      'Estado de torneo no válido.'
    )
    .optional(),

  combat_duration_sec: number()
    .positive('La duración del combate debe ser positiva.')
    .integer('La duración debe ser un número entero.')
    .optional(),
});
