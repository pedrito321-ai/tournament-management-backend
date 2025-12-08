import { object, number, string, mixed } from 'yup'

export const createUserBlockSchema = object({
  user_id: number()
    .required('El usuario a bloquear es obligatorio.')
    .positive('El user_id debe ser un número positivo.')
    .integer('El user_id debe ser un número entero.'),

  reason: string()
    .required('El motivo del bloqueo es obligatorio.')
    .min(10, 'El motivo debe tener al menos 10 caracteres.')
    .max(500, 'El motivo no puede superar los 500 caracteres.'),
})
  .noUnknown(
    true,
    'Solo se permiten las propiedades user_id y reason.',
  )
  .strict(true)

export const updateUserBlockStatusSchema = object({
  status: mixed()
    .oneOf(['pending', 'active', 'lifted'])
    .required('El estado del bloqueo es obligatorio.'),
})
  .noUnknown(true)
  .strict(true)
