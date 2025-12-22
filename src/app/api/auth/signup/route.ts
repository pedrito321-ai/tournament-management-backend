import prisma from '@/libs/prisma'
import { userRegisterSchema } from '@/schemas/user.schema'
import { NextResponse, NextRequest } from 'next/server'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { ValidationError } from 'yup'
import { validateRol } from '@/libs/user/validateRol'
import { createUser } from '@/service/users'

export async function POST(request: NextRequest) {
  try {
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
      dni
    } = await userRegisterSchema.validate(body, { abortEarly: false })

    // Verificar si nickname ya existe
    const existingNickname = await prisma.users.findUnique({
      where: { nickname },
    })

    if (existingNickname) {
      return NextResponse.json(
        { error: 'El nickname ya está en uso' },
        { status: 409 }
      )
    }

    // Verificar si email ya existe
    const existingEmail = await prisma.users.findUnique({
      where: { email },
    })

    if (existingEmail) {
      return NextResponse.json(
        { error: 'El email ya está en uso' },
        { status: 409 }
      )
    }

    // Validar datos según rol
    const roleValidationResult = await validateRol({
      currentRole: role!,
      club_id,
      dni,
    })

    if (roleValidationResult?.error) {
      return NextResponse.json(
        { error: roleValidationResult.error },
        { status: roleValidationResult.status }
      )
    }

    // Hashear contraseña
    const hashedPassword = await bcrypt.hash(user_password, 10)

    // Crear usuario y sus tablas relacionadas
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

    // Generar JWT
    const jwtExpiresIn = Number(process.env.JWT_EXPIRES_IN) || 3600

    const token = jwt.sign(
      {
        id: newUser.id,
        nickname: newUser.nickname,
        role: newUser.role,
        email: newUser.email,
      },
      process.env.JWT_SECRET!,
      { expiresIn: jwtExpiresIn }
    )

    return NextResponse.json(
      {
        message: 'Usuario registrado exitosamente',
        user: {
          id: newUser.id,
          name: newUser.name,
          lastName: newUser.lastName,
          age: newUser.age,
          nickname: newUser.nickname,
          email: newUser.email,
          role: newUser.role,
        },
        token,
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ errors: error.errors }, { status: 400 })
    }

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}