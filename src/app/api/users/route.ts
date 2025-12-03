import { verifyAuth } from '@/libs/auth'
import prisma from '@/libs/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { applyCorsHeaders, handleCorsOptions } from '@/libs/cors';
import { userRegisterSchema } from '@/schemas/user.schema';
import { validateRol } from '@/libs/user/validateRol';
import bcrypt from 'bcrypt'
import { createUser } from '@/libs/user/createUser';
import { ValidationError } from 'yup';

export async function OPTIONS() {
  return handleCorsOptions();
}

export async function GET(request: NextRequest) {
  try {
    // Validar token de acceso
    const auth = verifyAuth(request)
    if (!auth.valid) return auth.response

    const { searchParams } = new URL(request.url)

    const skip = Number(searchParams.get('skip'))
    const take = Number(searchParams.get('take') ?? 10)

    if (isNaN(skip) || skip < 0) {
      return applyCorsHeaders(
        NextResponse.json(
          { error: 'skip debe ser un número válido mayor o igual a 0.' },
          { status: 400 }
        )
      );
    }

    if (isNaN(take) || take < 1) {
      return applyCorsHeaders(
        NextResponse.json(
          { error: 'take debe ser un número válido mayor o igual a 1.' },
          { status: 400 },
        )
      );
    }

    const users = await prisma.users.findMany({
      skip,
      take,
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        name: true,
        lastName: true,
        age: true,
        profile_picture: true,
        nickname: true,
        email: true,
        role: true,
        created_at: true,
        updated_at: true,
        // Datos cuando es dueño del club
        club_owner: {
          select: {
            dni: true,
            is_approved: true,
            approved_by_admin_id: true,
            approved_at: true,
          }
        },
        // Datos cuando es competidor
        competitor: {
          select: {
            club_id: true,
            is_approved: true,
            approved_by: true,
            approved_at: true,
          }
        }
      }
    })

    return applyCorsHeaders(
      NextResponse.json({
        message: 'Acceso concedido',
        userAuth: auth.decoded,
        data: users
      })
    )
  } catch {
    return applyCorsHeaders(
      NextResponse.json(
        { error: 'Error interno del servidor. Inténtalo más tarde.' },
        { status: 500 },
      )
    );
  }
}

// Crear usuario (solo admin)
export async function POST(request: NextRequest) {
  try {
    // Verificar token
    const auth = verifyAuth(request);
    if (!auth.valid) return auth.response;

    // Verificar rol
    const userRole = auth.decoded?.role;
    if (userRole !== 'admin') {
      return applyCorsHeaders(
        NextResponse.json(
          { error: 'Solo los administradores pueden eliminar noticias.' },
          { status: 403 }
        )
      );
    }

    const body = await request.json()

    const {
      name,
      lastName,
      age,
      nickname,
      email,
      user_password,
      role,
      club_id,
      dni,
    } = await userRegisterSchema.validate(body, { abortEarly: false })

    // Verificar si nickname ya existe
    const existingNickname = await prisma.users.findUnique({
      where: { nickname },
    })

    if (existingNickname) {
      return applyCorsHeaders(
        NextResponse.json(
          { error: 'El nickname ya está en uso' },
          { status: 409 }
        )
      )
    }

    // Verificar si email ya existe
    const existingEmail = await prisma.users.findUnique({
      where: { email },
    })

    if (existingEmail) {
      return applyCorsHeaders(
        NextResponse.json(
          { error: 'El email ya está en uso' },
          { status: 409 }
        )
      )
    }

    // Validar datos según rol
    const roleValidationResult = await validateRol({
      currentRole: role!,
      club_id,
      dni,
    })

    if (roleValidationResult?.error) {
      return applyCorsHeaders(
        NextResponse.json(
          { error: roleValidationResult.error },
          { status: roleValidationResult.status }
        )
      )
    }

    // Hashear contraseña
    const hashedPassword = await bcrypt.hash(user_password, 10)

    // Crear usuario
    const newUser = await createUser({
      name,
      lastName,
      age,
      nickname,
      email,
      user_password: hashedPassword,
      role,
      club_id,
      dni,
    })

    // No generamos token, solo devolvemos info del usuario
    return applyCorsHeaders(
      NextResponse.json(
        {
          message: 'Usuario creado exitosamente por admin',
          user: {
            id: newUser.id,
            name: newUser.name,
            lastName: newUser.lastName,
            age: newUser.age,
            nickname: newUser.nickname,
            email: newUser.email,
            role: newUser.role,
          },
        },
        { status: 201 }
      )
    )
  } catch (error) {
    if (error instanceof ValidationError) {
      return applyCorsHeaders(
        NextResponse.json({ errors: error.errors }, { status: 400 })
      )
    }

    return applyCorsHeaders(
      NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      )
    )
  }
}