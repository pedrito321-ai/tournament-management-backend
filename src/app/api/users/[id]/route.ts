import { type NextRequest, NextResponse } from 'next/server'
import prisma from '@/libs/prisma'
import { verifyAuth } from '@/libs/auth';
import { userUpdateSchema, clubOwnerUpdateSchema, competitorUpdateSchema } from '@/schemas/user.schema';
import bcrypt from 'bcrypt';
import { users } from '@prisma/client';
import { ValidationError } from 'yup';
import { validateRol } from '@/libs/user/validateRol';
import { applyCorsHeaders, handleCorsOptions } from '@/libs/cors';

export async function OPTIONS() {
  return handleCorsOptions();
}

// TODO: Determinar si para ver usuario se necesita iniciar sesión
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Validar token de acceso
    const auth = verifyAuth(request);
    if (!auth.valid) return auth.response;

    const { id } = await params

    const numericId = Number(id)

    if (isNaN(numericId)) {
      return NextResponse.json(
        { error: 'ID debe ser un número válido.' },
        { status: 400 },
      )
    }

    // Bucar usuario
    const user = await prisma.users.findFirst({
      where: { id: numericId },
      select: {
        id: true,
        name: true,
        lastName: true,
        age: true,
        nickname: true,
        role: true,
        created_at: true,
        updated_at: true,
        // Datos cuando es dueño del club
        club_owners: {
          select: {
            dni: true,
            is_approved: true,
            approved_by_admin_id: true,
            approved_at: true,
          }
        },

        // Datos cuando es competidor
        competitors_competitors_user_idTousers: {
          select: {
            club_id: true,
            is_approved: true,
            approved_by: true,
            approved_at: true,
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: `El ID ${ numericId } no existe` },
        { status: 404 },
      )
    }

    return NextResponse.json(user)
  } catch {
    return NextResponse.json(
      { error: 'Error interno del servidor. Inténtalo más tarde.' },
      { status: 500 },
    )
  }
}

// Eliminar usuario (solo admin)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar token
    const auth = verifyAuth(request);
    if (!auth.valid) return auth.response;

    // Verificar rol
    const userRole = auth.decoded?.role;
    if (userRole !== 'admin') {
      return applyCorsHeaders(
        NextResponse.json(
          { error: 'Solo los administradores pueden eliminar usuarios.' },
          { status: 403 },
        )
      )
    }

    const { id } = await params
    const numericId = Number(id)

    if (isNaN(numericId)) {
      return applyCorsHeaders (
        NextResponse.json(
          { error: 'ID debe ser un número válido.' },
          { status: 400 },
        )
      )
    }

    // Verificar si el usuario ya existe
    const existingUser = await prisma.users.findUnique({ where: { id: numericId } })

    if (!existingUser) {
      return applyCorsHeaders(
        NextResponse.json(
          { error: `El usuario con ID ${ numericId } no existe.` },
          { status: 400 },
        )
      )
    }

    // Eliminar el usuario
    await prisma.users.delete({
      where: { id: numericId },
    });

    return applyCorsHeaders(
      NextResponse.json({
        message: `El usuario con ID ${ numericId } eliminado correctamente.`,
      })
    );
  } catch (error){
    console.log(error)
    return applyCorsHeaders(
      NextResponse.json(
        { error: 'Error interno del servidor al eliminar el usuario.' },
        { status: 500 },
      )
    )
  }
}

// TODO: Refactorizar la actualización de usuario
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar token
    const auth = verifyAuth(request);
    if (!auth.valid) return auth.response;

    // Obtener rol del usuario autenticado
    const userRole = auth.decoded?.role;
    const authenticatedUserId = auth.decoded?.id;

    if (!userRole || !authenticatedUserId) {
      return NextResponse.json(
        { error: 'Token inválido o incompleto.' },
        { status: 401 },
      );
    }

    const { id } = await params
    const numericId = Number(id)

    if (isNaN(numericId)) {
      return NextResponse.json(
        { error: 'ID debe ser un número válido.' },
        { status: 400 },
      )
    }

    // Verificar si el usuario a actualizar existe
    const existingUser = await prisma.users.findUnique({ 
      where: { id: numericId },
      include: {
        club_owners: true,
        competitors_competitors_user_idTousers: true,
      }
    })

    if (!existingUser) {
      return NextResponse.json(
        { error: `El usuario con ID ${ numericId } no existe.` },
        { status: 400 },
      );
    }

    // Lógica según el rol del usuario autenticado
    if (userRole === 'admin') {
      // Admin puede actualizar cualquier cosa
      return await handleAdminUpdate(request, numericId, existingUser);
    } else if (userRole === 'club_owner') {
      // Club owner solo puede actualizar is_approved y approved_by_admin_id
      // No puede actualizar usuarios competitor
      return await handleClubOwnerUpdate(request, numericId, existingUser, Number(authenticatedUserId));
    } else if (userRole === 'competitor') {
      // Competitor solo puede actualizar is_approved y approved_by
      // No puede actualizar usuarios club_owner
      return await handleCompetitorUpdate(request, numericId, existingUser, Number(authenticatedUserId));
    } else {
      return NextResponse.json(
        { error: 'Rol no autorizado para actualizar usuarios.' },
        { status: 403 },
      );
    }
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { errors: error.errors },
        { status: 400 }
      )
    }

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Error interno del servidor al actualizar el usuario.' },
      { status: 500 },
    );
  }
}

// Handler para actualizaciones de admin (puede actualizar todo)
async function handleAdminUpdate(request: NextRequest, numericId: number, existingUser: any) {
  const requestBody = await request.json();
  
  const {
    name,
    lastName,
    age,
    nickname,
    user_password,
    role,
    club_id,
    dni
  } = await userUpdateSchema.validate(requestBody);

  // Extraer propiedades específicas de club_owner o competitor
  const { is_approved, approved_by_admin_id, approved_by } = requestBody;

  // Protección de cambio de rol: solo se permite si el usuario es admin
  if (role && role !== existingUser.role && existingUser.role !== 'admin') {
    return NextResponse.json(
      { error: 'No se puede cambiar el rol de usuarios que no sean administradores.' },
      { status: 403 },
    );
  }

  // Validar datos según rol (solo si hay cambio de rol)
  if (role && role !== existingUser.role) {
    const roleValidationResult = await validateRol({
      currentRole: role,
      club_id,
      dni,
    })

    if (roleValidationResult?.error) {
      return NextResponse.json(
        { error: roleValidationResult.error },
        { status: roleValidationResult.status }
      )
    }
  }

  // Preparar datos para actualizar en la tabla users
  const dataToUpdate: Partial<Pick<users, 'name' | 'lastName' | 'age' | 'nickname' | 'user_password' | 'role'>> = {}

  // Agregar campos si se proporcionan
  if (name) dataToUpdate.name = name;
  if (lastName) dataToUpdate.lastName = lastName;
  if (age !== undefined) dataToUpdate.age = age;
  if (nickname) dataToUpdate.nickname = nickname;
  if (role) dataToUpdate.role = role;
  if (user_password) {
    dataToUpdate.user_password = await bcrypt.hash(user_password, 10);
  }

  // Usar transacción para actualizar usuario y manejar registros relacionados
  const userUpdate = await prisma.$transaction(async (tx) => {
    // Actualizar usuario solo si hay cambios en la tabla users
    let updatedUser;
    if (Object.keys(dataToUpdate).length > 0) {
      updatedUser = await tx.users.update({
        where: { id: numericId },
        data: dataToUpdate,
      });
    } else {
      updatedUser = existingUser;
    }

    // Manejar cambios de rol si se especificó un nuevo rol
    if (role && role !== existingUser.role) {
      // Eliminar registro anterior según el rol antiguo
      if (existingUser.role === 'competitor') {
        await tx.competitors.deleteMany({ where: { user_id: numericId } })
      } else if (existingUser.role === 'club_owner') {
        await tx.club_owners.deleteMany({ where: { user_id: numericId } })
      }

      // Crear nuevo registro según el nuevo rol
      if (role === 'competitor') {
        if (!club_id) {
          throw new Error('El club_id es obligatorio para competidores.')
        }
        await tx.competitors.create({
          data: {
            user_id: numericId,
            club_id: club_id
          }
        })
      } else if (role === 'club_owner') {
        if (!dni) {
          throw new Error('El DNI es obligatorio para dueños de club.')
        }
        await tx.club_owners.create({
          data: {
            user_id: numericId,
            dni: dni
          }
        })
      }
    } else {
      // Si no hay cambio de rol, actualizar campos adicionales en tablas relacionadas
      if (existingUser.role === 'competitor') {
        const competitorData: any = {};
        if (club_id) competitorData.club_id = club_id;
        if (is_approved !== undefined) {
          competitorData.is_approved = is_approved;
          competitorData.approved_at = new Date();
        }
        if (approved_by) competitorData.approved_by = approved_by;
        
        if (Object.keys(competitorData).length > 0) {
          await tx.competitors.updateMany({
            where: { user_id: numericId },
            data: competitorData
          });
        }
      } else if (existingUser.role === 'club_owner') {
        const clubOwnerData: any = {};
        if (dni) clubOwnerData.dni = dni;
        if (is_approved !== undefined) {
          clubOwnerData.is_approved = is_approved;
          clubOwnerData.approved_at = new Date();
        }
        if (approved_by_admin_id) clubOwnerData.approved_by_admin_id = approved_by_admin_id;
        
        if (Object.keys(clubOwnerData).length > 0) {
          await tx.club_owners.updateMany({
            where: { user_id: numericId },
            data: clubOwnerData
          });
        }
      }
    }

    return updatedUser
  });

  return NextResponse.json({
    message: `El usuario con ID ${ numericId } actualizado correctamente.`,
    data: userUpdate
  });
}

// Handler para actualizaciones de club_owner
async function handleClubOwnerUpdate(request: NextRequest, numericId: number, existingUser: any, authenticatedUserId: number) {
  // Validar que solo se envíen campos permitidos
  const updateData = await clubOwnerUpdateSchema.validate(await request.json());

  // Verificar que el usuario a actualizar NO sea un competitor
  if (existingUser.role === 'competitor') {
    return NextResponse.json(
      { error: 'Los usuarios club_owner no pueden actualizar usuarios competitor.' },
      { status: 403 },
    );
  }

  // Verificar que el usuario a actualizar sea un club_owner
  if (existingUser.role !== 'club_owner') {
    return NextResponse.json(
      { error: 'Solo se pueden actualizar usuarios con rol club_owner.' },
      { status: 403 },
    );
  }

  // is_approved ya viene como boolean del schema
  const isApprovedValue = updateData.is_approved;

  // Actualizar solo en la tabla club_owners
  const updateResult = await prisma.club_owners.updateMany({
    where: { user_id: numericId },
    data: {
      ...(isApprovedValue !== undefined && { is_approved: isApprovedValue }),
      ...(updateData.approved_by_admin_id && { approved_by_admin_id: updateData.approved_by_admin_id }),
      ...(isApprovedValue !== undefined && { approved_at: new Date() }),
    }
  });

  if (updateResult.count === 0) {
    return NextResponse.json(
      { error: 'No se pudo actualizar el registro de club_owner.' },
      { status: 400 },
    );
  }

  return NextResponse.json({
    message: `El usuario club_owner con ID ${ numericId } actualizado correctamente.`,
  });
}

// Handler para actualizaciones de competitor
async function handleCompetitorUpdate(request: NextRequest, numericId: number, existingUser: any, authenticatedUserId: number) {
  // Validar que solo se envíen campos permitidos
  const updateData = await competitorUpdateSchema.validate(await request.json());

  // Verificar que el usuario a actualizar NO sea un club_owner
  if (existingUser.role === 'club_owner') {
    return NextResponse.json(
      { error: 'Los usuarios competitor no pueden actualizar usuarios club_owner.' },
      { status: 403 },
    );
  }

  // Verificar que el usuario a actualizar sea un competitor
  if (existingUser.role !== 'competitor') {
    return NextResponse.json(
      { error: 'Solo se pueden actualizar usuarios con rol competitor.' },
      { status: 403 },
    );
  }

  // is_approved ya viene como boolean del schema
  const isApprovedValue = updateData.is_approved;

  // Actualizar solo en la tabla competitors
  const updateResult = await prisma.competitors.updateMany({
    where: { user_id: numericId },
    data: {
      ...(isApprovedValue !== undefined && { is_approved: isApprovedValue }),
      ...(updateData.approved_by && { approved_by: updateData.approved_by }),
      ...(isApprovedValue !== undefined && { approved_at: new Date() }),
    }
  });

  if (updateResult.count === 0) {
    return NextResponse.json(
      { error: 'No se pudo actualizar el registro de competitor.' },
      { status: 400 },
    );
  }

  return NextResponse.json({
    message: `El usuario competitor con ID ${ numericId } actualizado correctamente.`,
  });
}