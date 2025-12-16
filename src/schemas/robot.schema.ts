import { mixed, number, object, string, type InferType } from 'yup';
import { robot_control_type, robot_status } from '@prisma/client';

export const createRobotSchema = object({
  name: string().required('El nombre del robot es obligatorio.').max(255),

  category_id: number()
    .required('La categoría es obligatoria.')
    .integer()
    .positive(),

  control_type: mixed<'autonomous' | 'remote' | 'semi_autonomous'>()
    .oneOf(['autonomous', 'remote', 'semi_autonomous'])
    .required('El tipo de control es obligatorio.'),
});

export const updateRobotSchema = object({
  name: string().max(255),

  category_id: number().integer().positive(),

  control_type: mixed<robot_control_type>().oneOf([
    'autonomous',
    'remote',
    'semi_autonomous',
  ]),

  // Solo admin puede modificar estos campos
  status: mixed<robot_status>().oneOf([
    'active',
    'inactive',
    'disqualified',
    'damaged',
  ]),

  wins: number().integer().min(0),
  losses: number().integer().min(0),
  matches_played: number().integer().min(0),

  // Campo para detectar intentos de modificación (prohibido para todos)
  competitor_id: number().integer().positive(),
});

// Tipos inferidos para reutilización
export type UpdateRobotInput = InferType<typeof updateRobotSchema>;
export type CreateRobotInput = InferType<typeof createRobotSchema>;
