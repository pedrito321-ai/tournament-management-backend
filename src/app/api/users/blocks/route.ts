import { verifyAuth } from '@/libs/auth'
import prisma from '@/libs/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { applyCorsHeaders, handleCorsOptions } from '@/libs/cors';
import { ValidationError } from 'yup';
import { createUserBlockSchema } from '@/schemas/user-blocks.schema';

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

// SOLO ADMIN (GET, POST)
export async function GET(request: NextRequest) {
  try {
    // Validar token Y rol admin
    const auth = verifyAuth(request)
    if (!auth.valid) return auth.response

    const userRole = auth.decoded?.role;

    if (userRole !== 'admin') {
      return applyCorsHeaders(
        request,
        NextResponse.json(
          { error: 'Solo los administradores pueden ver los bloqueos de usuarios.' },
          { status: 403 }
        )
      )
    }

    // Páginación
    const { searchParams } = new URL(request.url)

    const skip = Number(searchParams.get('skip'))
    const take = Number(searchParams.get('take') ?? 10)

    if (isNaN(skip) || skip < 0) {
      return applyCorsHeaders(
        request,
        NextResponse.json(
          { error: 'skip debe ser un número válido mayor o igual a 0.' },
          { status: 400 }
        )
      );
    }

    if (isNaN(take) || take < 1) {
      return applyCorsHeaders(
        request,
        NextResponse.json(
          { error: 'take debe ser un número válido mayor o igual a 1.' },
          { status: 400 },
        )
      );
    }

    const userBlocks = await prisma.user_blocks.findMany({
      skip,
      take,
      orderBy: { blocked_at: 'desc' },
      include: {
        // Usuario que fue bloqueado
        user: {
          select: {
            id: true,
            name: true,
            lastName: true,
            nickname: true,
            email: true,
          }
        },
        // Admin que aplicó el bloqueo
        blockedBy: {
          select: {
            id: true,
            name: true,
            lastName: true,
            nickname: true,
            email: true,
          }
        }
      }
    })

    return applyCorsHeaders(
      request,
      NextResponse.json({
        message: 'Bloqueos obtenidos correctamente',
        total: userBlocks.length,
        data: userBlocks
      })
    )
  } catch {
    return applyCorsHeaders(
      request,
      NextResponse.json(
        { error: 'Error interno del servidor. Inténtalo más tarde.' },
        { status: 500 },
      )
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verificamos que el usuario esté autenticado mediante el token
    const auth = verifyAuth(request);
    if (!auth.valid) return auth.response;

    // Obtenemos el ID del usuario que está ejecutando el bloqueo (quien hace la solicitud)
    const blockerId = auth.decoded?.id;

    // Leemos el body y Validamos los datos con Yup
    const body = await request.json()

    const {
      user_id,
      reason
    } = await createUserBlockSchema.validate(body, { abortEarly: false })

    //  Verificamos que el usuario a bloquear realmente exista
    const userExists = await prisma.users.findUnique({
      where: { id: user_id },
    })

    if (!userExists) {
      return applyCorsHeaders(
        request,
        NextResponse.json(
          { error: 'Usuario no encontrado' },
          { status: 404 }
        )
      )
    }

    // Crear el registro del bloqueo
    const newUserLock = await prisma.user_blocks.create({
      data: {
        user_id,
        reason,
        blocked_by: +blockerId!,
      }
    })

    return applyCorsHeaders(
      request,
      NextResponse.json(
        {
          message: 'Solicitud de bloqueo registrada correctamente',
          userLock: newUserLock,
        },
        { status: 201 }
      )
    )
  } catch (error) {
    // Capturamos errores de validación de Yup
    if (error instanceof ValidationError) {
      return applyCorsHeaders(
        request,
        NextResponse.json({ error: error.message }, { status: 400 })
      )
    }

    return applyCorsHeaders(
      request,
      NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      )
    )
  }
}