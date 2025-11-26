import { object, string, number } from 'yup';

export const newsCreateSchema = object({
  title: string()
    .required('El título de la noticia es obligatorio.')
    .min(3, 'El título debe tener al menos 3 caracteres.')
    .max(255, 'El título no puede superar los 255 caracteres.'),

  content: string().required('El contenido de la noticia es obligatorio.'),

  image_url: string().url('La URL de la imagen no es válida.').nullable(),

  published_by: number()
    .required('El ID del publicador es obligatorio.')
    .typeError('El publicador debe ser un número.'),

  source: string()
    .max(255, 'La fuente no puede superar 255 caracteres.')
    .nullable(),
})
  .noUnknown(
    true,
    'Solo se permiten las propiedades title, content, image_url, published_by, news_date y source.'
  )
  .strict(true);

export const newsUpdateSchema = newsCreateSchema
  .omit(['published_by'])
  .noUnknown(
    true,
    'Solo se permiten las propiedades title, content, image_url y source.'
  )
  .strict(true)
  .partial();
