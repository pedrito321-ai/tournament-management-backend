import { object, number, string } from 'yup';

/**
 * Schema para registrar el resultado de un combate (solo judge o admin)
 */
export const setMatchResultSchema = object({
  winner_id: number()
    .required('El ID del ganador es obligatorio.')
    .positive('El ID del ganador debe ser positivo.')
    .integer('El ID del ganador debe ser un número entero.'),

  victory_type: string()
    .max(100, 'El tipo de victoria no puede superar los 100 caracteres.')
    .optional(),
});
