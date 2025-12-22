import { verifyAuth } from '@/libs/auth';
import { NextRequest, NextResponse } from 'next/server';
import { applyCorsHeaders, handleCorsOptions } from '@/libs/cors';
import { createJsonErrorResponse } from '@/helpers/createJsonErrorResponse';
import { getCompetitorRanking } from '@/service/ranking';

export async function OPTIONS() {
  return handleCorsOptions();
}

// Obtener ranking de competidores
export async function GET(request: NextRequest) {
  try {
    const auth = verifyAuth(request);
    if (!auth.valid) return auth.response;

    const { searchParams } = new URL(request.url);
    const skip = Number(searchParams.get('skip') ?? 0);
    const take = Number(searchParams.get('take') ?? 50);

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

    const { total, rankings } = await getCompetitorRanking({ skip, take });

    return applyCorsHeaders(
      NextResponse.json({
        message: 'Ranking de competidores obtenido exitosamente',
        total,
        data: rankings,
      })
    );
  } catch {
    return createJsonErrorResponse({});
  }
}
