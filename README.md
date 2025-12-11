# Tournament management

Proporciona APIs REST para administrar torneos, usuarios, roles y datos de partidas de manera eficiente.

## 🔧 Instalación

1. **Clonar el repositorio**

```bash
git clone https://github.com/anibalcoder/tournament-management-backend.git
cd tournament-management-backend
```

2. **Configurar entorno**

    - Crear una copia de `.env.template` y renombrar a `.env`.
    - Luego, reemplaza los valores según tus credenciales.

3. **Instala dependencias**

```bash
npm install
```

4. **Prisma**

Ejecuta los siguientes comandos para preparar Prisma en tu entorno local:

```bash
# Generar Prisma Client
npx prisma generate

# Aplicar migraciones a la base de datos
npx prisma migrate dev
```

5. **Iniciar servidor de desarrollo**

```bash
npm run dev
```