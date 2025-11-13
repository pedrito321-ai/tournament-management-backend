import prisma from '@/libs/prisma';
import { userRegisterSchema } from '@/schemas/user.schema';
import { NextResponse, NextRequest } from 'next/server'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { ValidationError } from 'yup';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { full_name, nickname, user_password, role } = await userRegisterSchema.validate(body, { abortEarly: false })
  
    // Verificar si el usuario ya existe
    const existingUser = await prisma.users.findUnique({ where: { nickname } })

    if (existingUser) {
      return NextResponse.json(
        { error: 'El nickname ya está en uso' },
        { status: 409 }
      )
    }

    // Encriptar la contraseña
    const hashedPassword = await bcrypt.hash(user_password, 10)

    const newUser = await prisma.users.create({
      data: {
        full_name,
        nickname,
        user_password: hashedPassword,
        role
      }
    })

    // Genera un JWT al registrarse para autenticar al usuario de inmediato sin pasar por login.
    const jwtExpiresIn = Number(process.env.JWT_EXPIRES_IN) || 3600

    const token = jwt.sign(
      { id: newUser.id, nickname: newUser.nickname, role: newUser.role },
      process.env.JWT_SECRET!,
      { expiresIn: jwtExpiresIn }
    )

    return NextResponse.json(
      {
        message: 'Usuario registrado exitosamente',
        user: {
          id: newUser.id,
          full_name: newUser.full_name,
          nickname: newUser.nickname,
          role: newUser.role,
        },
        token
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { errors: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}