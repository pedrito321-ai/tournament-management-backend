import { verifyAuth } from '@/libs/auth';
import { NextRequest, NextResponse } from 'next/server';
import { applyCorsHeaders, handleCorsOptions } from '@/libs/cors';
import { createTournamentSchema } from '@/schemas/tournament.schema';
import { ValidationError } from 'yup';
import { createJsonErrorResponse } from '@/helpers/createJsonErrorResponse';
import {
  createTournament,
  getTournaments,
  validateCategoryExists,
  validateJudgeForTournament,
  validateAllowedClubs,
} from '@/service/tournament';
import { tournament_status } from '@prisma/client';

export async function OPTIONS() {
  return handleCorsOptions();
}

// Listar torneos con filtros
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const skip = Number(searchParams.get('skip') ?? 0);
    const take = Number(searchParams.get('take') ?? 10);
    const status = searchParams.get('status') as tournament_status | null;
    const categoryId = searchParams.get('category_id');

    if (isNaN(skip) || skip < 0) {
      return createJsonErrorResponse({
        message: 'skip debe ser un número válido mayor o igual a 0.',
        status: 400,
      });
    }

    if (isNaN(take) || take < 1) {
      return createJsonErrorResponse({
        message: 'take debe ser un número válido mayor o igual a 1.',
        status: 400,
      });
    }

    const { total, tournaments } = await getTournaments({
      skip,
      take,
      status: status ?? undefined,
      category_id: categoryId ? Number(categoryId) : undefined,
    });

    return applyCorsHeaders(
      NextResponse.json({
        message: 'Torneos obtenidos exitosamente',
        total,
        data: tournaments,
      })
    );
  } catch {
    return createJsonErrorResponse({});
  }
}

// Crear torneo (solo admin)
export async function POST(request: NextRequest) {
  try {
    const auth = verifyAuth(request);
    if (!auth.valid) return auth.response;

    const userRole = auth.decoded?.role;

    if (userRole !== 'admin') {
      return createJsonErrorResponse({
        message: 'Solo los administradores pueden crear torneos.',
        status: 403,
      });
    }

    const body = await request.json();

    const validatedData = await createTournamentSchema.validate(body, {
      abortEarly: false,
    });

    // Validar que la categoría existe
    const categoryValidation = await validateCategoryExists(
      validatedData.category_id
    );
    if (categoryValidation.error) {
      return createJsonErrorResponse({
        message: categoryValidation.error,
        status: categoryValidation.status!,
      });
    }

    // Validar que el juez es válido para el torneo
    const judgeValidation = await validateJudgeForTournament(
      validatedData.judge_id,
      validatedData.category_id
    );
    if (judgeValidation.error) {
      return createJsonErrorResponse({
        message: judgeValidation.error,
        status: judgeValidation.status!,
      });
    }

    // Validar que los clubes existen y están aprobados
    const clubsValidation = await validateAllowedClubs(
      validatedData.allowed_club_ids.filter((id): id is number => id !== undefined)
    );
    if (clubsValidation.error) {
      return createJsonErrorResponse({
        message: clubsValidation.error,
        status: clubsValidation.status!,
      });
    }

    // Crear el torneo
    const tournament = await createTournament({
      ...validatedData,
      judge_user_id: validatedData.judge_id,
      allowed_club_ids: validatedData.allowed_club_ids.filter(
        (id): id is number => id !== undefined
      ),
      created_by: Number(auth.decoded?.id),
    });

    return applyCorsHeaders(
      NextResponse.json(
        {
          message: 'Torneo creado exitosamente',
          data: tournament,
        },
        { status: 201 }
      )
    );
  } catch (error) {
    if (error instanceof ValidationError) {
      return applyCorsHeaders(
        NextResponse.json({ error: error.errors }, { status: 400 })
      );
    }

    return createJsonErrorResponse({});
  }
}
