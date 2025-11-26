import { verifyAuth } from '@/libs/auth'
import prisma from '@/libs/prisma'
import { newsCreateSchema } from '@/schemas/newsItem.schema'
import { NextRequest, NextResponse } from 'next/server'
import { ValidationError } from 'yup'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const skip = Number(searchParams.get('skip'))
    const take = Number(searchParams.get('take') ?? 10)

    if (isNaN(skip) || skip < 0) {
      return NextResponse.json(
        { error: 'skip debe ser un número válido mayor o igual a 0.' },
        { status: 400 },
      )
    }

    if (isNaN(take) || take < 1) {
      return NextResponse.json(
        { error: 'take debe ser un número válido mayor o igual a 1.' },
        { status: 400 },
      )
    }

    const news = await prisma.news.findMany({
      skip,
      take,
      orderBy: { created_at: 'desc' },
      include: {
        users: {
          select: {
            name: true,
            email: true,
            nickname: true
          }
        }
      }
    })

    return NextResponse.json({
      data: news
    })
  } catch {
    return NextResponse.json(
      { error: 'Error interno del servidor. Inténtalo más tarde.' },
      { status: 500 },
    )
  }
}

// Crear noticia (solo admin)
export async function POST(request: NextRequest) {
  try {
    // Verificar token
    const auth = verifyAuth(request)
    if (!auth.valid) return auth.response

    const userRole = auth.decoded?.role

    // Solo un admin puede crear una noticia
    if (userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Solo los administradores pueden crear una noticia.' },
        { status: 403 }
      )
    }

    // Validar los datos de entrada
    const {
      title,
      content,
      published_by,
      image_url,
      source
    } = await newsCreateSchema.validate((await request.json()))

    // Crear noticia
    const newNews = await prisma.news.create({
      data: {
        title,
        content,
        published_by,
        image_url: image_url ?? null,
        source: source ?? null
      }
    })

    return NextResponse.json({
      message: 'Notica creado correctamente.',
      data: newNews
    })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { errors: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Error interno del servidor al actualizar la noticia.' },
      { status: 500 },
    )
  }
}