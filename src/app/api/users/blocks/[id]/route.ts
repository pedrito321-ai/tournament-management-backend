import { type NextRequest, NextResponse } from 'next/server'
import prisma from '@/libs/prisma'
import { verifyAuth } from '@/libs/auth';
import { ValidationError } from 'yup';
import { applyCorsHeaders, handleCorsOptions } from '@/libs/cors';
import { updateUserBlockStatusSchema } from '@/schemas/user-blocks.schema';

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request);
}

// SOLO ADMIN (GET, PATCH)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

    // Validar el ID del bloqueo
    const { id } = await params
    const numericId = Number(id)

    if (isNaN(numericId)) {
      return applyCorsHeaders(
        request,
        NextResponse.json(
          { error: 'ID debe ser un número válido.' },
          { status: 400 },
        )
      )
    }

    // Buscar bloqueo por ID
    const userBlock = await prisma.user_blocks.findFirst({
      where: { id: numericId },
      include: {
        // Usuario que fue bloqueado
        user: {
          select: {
            id: true,
            name: true,
            lastName: true,
            nickname: true,
            email: true,
            role: true,
            is_active: true,
            created_at: true,
          },
        },
        // Admin que aplicó el bloqueo
        blockedBy: {
          select: {
            id: true,
            name: true,
            lastName: true,
            nickname: true,
            email: true,
            role: true,
          },
        }
      }
    })

    if (!userBlock) {
      return applyCorsHeaders(
        request,
        NextResponse.json(
          { error: `No existe un bloqueo con ID ${numericId}` },
          { status: 404 },
        )
      )
    }

    return applyCorsHeaders(
      request,
      NextResponse.json({
        message: 'Bloqueo encontrado correctamente',
        data: userBlock,
      })
    )
  } catch {
    return applyCorsHeaders(
      request,
      NextResponse.json(
        { error: 'Error interno del servidor. Inténtalo más tarde.' },
        { status: 500 },
      )
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar token
    const auth = verifyAuth(request);
    if (!auth.valid) return auth.response;

    // Solo admin puede cambiar estado
    const userRole = auth.decoded?.role;
    if (userRole !== 'admin') {
      return applyCorsHeaders(
        request,
        NextResponse.json(
          { error: 'Solo los administradores pueden actualizar el estado del bloqueo.' },
          { status: 403 }
        )
      )
    }

    // Validar ID del bloqueo
    const { id } = await params
    const blockId = Number(id)

    if (isNaN(blockId)) {
      return applyCorsHeaders(
        request,
        NextResponse.json(
          { error: 'ID del bloqueo inválido.' },
          { status: 400 },
        )
      )
    }

    // Verificar que el bloqueo exista
    const existingBlock = await prisma.user_blocks.findUnique({
      where: { id: blockId }
    })

    if (!existingBlock) {
      return applyCorsHeaders(
        request,
        NextResponse.json(
          { error: `No existe un bloqueo con ID ${blockId}.` },
          { status: 404 }
        )
      )
    }

    // Validar body
    const body = await request.json()
    const { status } = await updateUserBlockStatusSchema.validate(body, { abortEarly: false })

    // 6. Actualizar bloqueo
    const updatedBlock = await prisma.user_blocks.update({
      where: { id: blockId },
      data: {
        status,
        unblocked_at: status === 'lifted' ? new Date() : null,
      }
    })

    // Activar o desactivar usuario según estado
    if (status === 'active') {
      await prisma.users.update({
        where: { id: existingBlock.user_id },
        data: { is_active: false }
      })
    }

    if (status === 'lifted') {
      await prisma.users.update({
        where: { id: existingBlock.user_id },
        data: { is_active: true }
      })
    }

    return applyCorsHeaders(
      request,
      NextResponse.json(
        {
          message: 'Estado del bloqueo actualizado correctamente',
          block: updatedBlock
        },
        { status: 200 }
      )
    )

  } catch (error) {
    if (error instanceof ValidationError) {
      return applyCorsHeaders(
        request,
        NextResponse.json(
          { error: error.message },
          { status: 400 }
        )
      )
    }

    return applyCorsHeaders(
      request,
      NextResponse.json(
        { error: 'Error interno del servidor al actualizar el bloqueo.' },
        { status: 500 }
      )
    )
  }
}