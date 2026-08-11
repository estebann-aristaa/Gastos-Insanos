# Sistema Financiero — desplegar en Vercel + instalar en iPhone

Todo gratis, sin backend. Los datos se guardan con `localStorage` del
navegador, directo en tu iPhone (o computador) — nadie más los ve, no
pasan por ningún servidor tuyo.

## 1. Súbelo a GitHub

```bash
cd mi-finanzas
git init
git add .
git commit -m "Sistema financiero"
```

Crea un repo **privado** en https://github.com/new y luego:

```bash
git remote add origin https://github.com/TU_USUARIO/mi-finanzas.git
git branch -M main
git push -u origin main
```

## 2. Despliega en Vercel

1. Entra a https://vercel.com con tu cuenta de GitHub.
2. "Add New" → "Project" → elige el repo `mi-finanzas`.
3. Vercel detecta Vite solo. No cambies nada. Dale "Deploy".
4. En 1-2 minutos te da una URL tipo `mi-finanzas.vercel.app`.

**Que se actualice sola:** cada vez que hagas `git push` a `main`,
Vercel vuelve a desplegar automáticamente. No hay que hacer nada más.

```bash
# cada vez que quieras subir un cambio:
git add .
git commit -m "ajuste"
git push
```

## 3. Instálalo en tu iPhone

1. Abre la URL de Vercel en **Safari** (tiene que ser Safari, no Chrome).
2. Toca el ícono de compartir (el cuadrado con la flecha hacia arriba).
3. Baja y toca **"Agregar a pantalla de inicio"**.
4. Listo — te queda un ícono como cualquier app, abre en pantalla
   completa sin barra de navegador.

No usa Service Worker a propósito: así cada vez que la abres, Safari
trae la versión más nueva directo de Vercel. No te vas a quedar
pegado en una versión vieja en caché.

## Sobre tus datos

- `localStorage` guarda todo en ESE dispositivo. Si abres la misma
  URL desde tu compu, vas a ver una app vacía (no sincroniza sola).
- El código todavía trae la separación "privado" / "compartido con tu
  hermano" (`PRIVATE_KEY` / `SHARED_KEY` en `src/App.jsx`) heredada
  de la versión anterior. Con `localStorage` esa separación ya NO
  sincroniza entre dispositivos distintos — ambas quedan guardadas
  en el mismo navegador. Si en algún momento tu hermano necesita
  agregar/ver esos datos desde SU propio celular, ahí sí te haría
  falta un backend real (ej. Supabase, plan gratis) — avísame y te
  armo esa parte.
- Sin backend = sin login, cualquiera con acceso físico al iPhone
  desbloqueado puede abrir la app y ver los números. Si te preocupa,
  se puede agregar un PIN simple más adelante.
