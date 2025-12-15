import { object, string, number, array } from 'yup';

export const newsCreateSchema = object({
  title: string()
    .required('El título de la noticia es obligatorio.')
    .min(3, 'El título debe tener al menos 3 caracteres.')
    .max(255, 'El título no puede superar los 255 caracteres.'),

  content: string().required('El contenido de la noticia es obligatorio.'),

  image_url: string().url('La URL de la imagen no es válida.').nullable(),

  source_name: string()
    .min(3, 'El nombre de la fuente debe tener al menos 3 caracteres.')
    .max(255, 'El nombre de la fuente no puede superar los 255 caracteres.')
    .nullable(),

  source_link: string().url('URL de fuente no válida').nullable(),

  source_logo_url: string().url('URL de logo no válida').nullable(),

  categories: array()
    .of(number().typeError('Las categorías deben ser números.'))
    .nullable(),
})
  .noUnknown(
    true,
    'Solo se permiten las propiedades title, content, image_url, source_name, source_link, source_logo_url y categories.'
  )
  .strict(true);

export const newsUpdateSchema = newsCreateSchema
  .partial()
  .noUnknown(
    true,
    'Solo se permiten las propiedades title, content, image_url, source_name, source_link, source_logo_url y categories.'
  )
  .strict(true)
