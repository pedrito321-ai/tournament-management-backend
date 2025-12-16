import prisma from '@/libs/prisma';
import type { Prisma } from '@prisma/client';
import type { UpdateRobotInput } from '@/schemas/robot.schema';
import {
  type RobotUpdateRole,
  ADMIN_ONLY_FIELDS,
  type RobotErrorCode,
  UpdateRobotParams,
} from '@/types/robot.types';

// Error de negocio específico para robots
export class RobotBusinessError extends Error {
  constructor(public readonly code: RobotErrorCode, message: string) {
    super(message);
    this.name = 'RobotBusinessError';
  }
}

// ============================================================================
// Validaciones de negocio
// ============================================================================

// Valida que no se intente modificar el competitor_id
function validateCompetitorIdNotModified(payload: UpdateRobotInput): void {
  if (payload.competitor_id !== undefined) {
    throw new RobotBusinessError(
      'COMPETITOR_ID_FORBIDDEN',
      'No se permite modificar el competidor del robot.'
    );
  }
}

// Valida que un competitor no modifique campos restringidos a admin
function validateAdminOnlyFields(
  payload: UpdateRobotInput,
  role: RobotUpdateRole
): void {
  if (role === 'admin') return;

  const forbiddenAttempted = ADMIN_ONLY_FIELDS.filter(
    (field) => payload[field] !== undefined
  );

  if (forbiddenAttempted.length > 0) {
    throw new RobotBusinessError(
      'FORBIDDEN_FIELDS',
      `No tiene permisos para actualizar: ${forbiddenAttempted.join(', ')}`
    );
  }
}

// Valida que no exista otro robot del mismo competidor en la nueva categoría
async function validateNoDuplicateCategory(
  robotId: number,
  competitorId: number,
  newCategoryId: number,
  currentCategoryId: number
): Promise<void> {
  if (newCategoryId === currentCategoryId) return;

  const existingRobot = await prisma.robots.findFirst({
    where: {
      competitor_id: competitorId,
      category_id: newCategoryId,
      NOT: { id: robotId },
    },
  });

  if (existingRobot) {
    throw new RobotBusinessError(
      'DUPLICATE_CATEGORY',
      'El competidor ya tiene un robot registrado en esta categoría.'
    );
  }
}

// ============================================================================
// Servicio principal
// ============================================================================

// Actualiza un robot aplicando validaciones de negocio
export async function updateRobot({
  robotId,
  payload,
  currentRobot,
  role,
}: UpdateRobotParams) {
  // Ejecutar validaciones de negocio
  validateCompetitorIdNotModified(payload);
  validateAdminOnlyFields(payload, role);

  if (payload.category_id) {
    await validateNoDuplicateCategory(
      robotId,
      currentRobot.competitor_id,
      payload.category_id,
      currentRobot.category_id
    );
  }

  // Construir datos base (solo incluir campos proporcionados)
  const baseData: Prisma.robotsUpdateInput = {
    ...(payload.name && { name: payload.name }),
    ...(payload.category_id && {
      categories: { connect: { id: payload.category_id } },
    }),
    ...(payload.control_type && { control_type: payload.control_type }),
  };

  // Agregar campos de admin si corresponde
  const adminData: Prisma.robotsUpdateInput =
    role === 'admin'
      ? {
          ...(payload.status && { status: payload.status }),
          ...(payload.wins !== undefined && { wins: payload.wins }),
          ...(payload.losses !== undefined && { losses: payload.losses }),
          ...(payload.matches_played !== undefined && {
            matches_played: payload.matches_played,
          }),
        }
      : {};

  // Ejecutar actualización y retornar con datos relacionados
  return prisma.robots.update({
    where: { id: robotId },
    data: { ...baseData, ...adminData },
    include: {
      categories: { select: { id: true, name: true } },
    },
  });
}
