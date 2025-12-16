import type { InferType } from 'yup';
import type { robots } from '@prisma/client';
import type { updateRobotSchema } from '@/schemas/robot.schema';

// Tipo inferido del schema de actualización de robots
export type UpdateRobotPayload = InferType<typeof updateRobotSchema>;

// Campos que solo el admin puede modificar
export const ADMIN_ONLY_FIELDS = [
  'status',
  'wins',
  'losses',
  'matches_played',
] as const;
export type AdminOnlyField = (typeof ADMIN_ONLY_FIELDS)[number];

// Roles permitidos para actualizar robots
export type RobotUpdateRole = 'admin' | 'competitor';

// Parámetros para el servicio de actualización
export interface UpdateRobotParams {
  robotId: number;
  payload: UpdateRobotPayload;
  currentRobot: robots;
  role: RobotUpdateRole;
}

// Códigos de error de negocio para robots
export type RobotErrorCode =
  | 'COMPETITOR_ID_FORBIDDEN'
  | 'DUPLICATE_CATEGORY'
  | 'FORBIDDEN_FIELDS';

// Mapeo de códigos de error a status HTTP
export const ROBOT_ERROR_STATUS: Record<RobotErrorCode, number> = {
  COMPETITOR_ID_FORBIDDEN: 403,
  DUPLICATE_CATEGORY: 409,
  FORBIDDEN_FIELDS: 403,
} as const;
