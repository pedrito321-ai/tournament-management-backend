import prisma from '@/libs/prisma';
import { NextResponse, NextRequest } from 'next/server'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

export async function POST(request: NextRequest) {
  try {
    
    const { nickname, user_password: password } = await request.json()

    const user = await prisma.users.findUnique({ where: { nickname } })

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    const validatePassword = await bcrypt.compare(password, user?.user_password as string)

    if (!validatePassword) {
      return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 })
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    )

    return NextResponse.json({
      message: 'Login exitoso',
      token,
      user: {
        id: user?.id,
        nickname: user?.nickname,
        role: user?.role
      }
    })
  } catch {
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}