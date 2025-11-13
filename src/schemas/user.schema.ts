import { object, string } from 'yup'
import { users_role } from '@prisma/client';

export const userRegisterSchema = object ({
  nickname: string ()
    .required ('El nickname es obligatorio.')
    .min (3, 'El nickname debe tener al menos 3 caracteres.')
    .max (30, 'El nickname no puede superar los 30 caracteres.'),

  full_name: string ()
    .required('El nombre completo es obligatorio.')
    .min(3, 'El nombre completo debe tener al menos 3 caracteres.')
    .max(250, 'El nombre completo no puede superar los 250 caracteres.'),

  user_password: string ()
    .required ('La contraseña es obligatoria.')
    .min (8, 'Debe tener al menos 8 caracteres.')
    .matches (/[A-Z]/, 'Debe incluir al menos una letra mayúscula.')
    .matches (/[a-z]/, 'Debe incluir al menos una letra minúscula.')
    .matches (/[&%#?♦♣৭Ǟ!@$^*()_+\-=[\]{};':"\\|,.<>/?]/, 'Debe incluir al menos un carácter especial.')
    .test (
      'no-dni',
      'La contraseña no puede ser un DNI (8 dígitos numéricos).',
      (value) => !/^\d{8}$/.test (value)
    ),

  role: string ()
    .oneOf (Object.values(users_role), 'Rol no válido.')
    .default (users_role.competitor),
})

export const userUpdateSchema = userRegisterSchema.partial();