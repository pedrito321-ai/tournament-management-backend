import { object, string } from 'yup'

export const categoryCreateSchema = object({
  name: string()
    .required('El nombre es obligatorio')
    .max(255, 'El nombre no puede superar los 255 caracteres'),

  description: string()
    .nullable()
    .optional()
})
  .noUnknown(
    true,
    'Solo se permiten las propiedades name y description',
  )
  .strict(true)

export const categoryUpdateSchema = categoryCreateSchema.partial();