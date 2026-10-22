# Gemelo Digital del Talento

Aplicacion web (movil primero) para que cada persona mantenga su **gemelo digital**:
un perfil profesional dinamico con competencias, objetivos, plan de desarrollo e
historial de evolucion. La persona decide que comparte; el personal de RR. HH. solo
accede a lo que ha sido autorizado de forma explicita.

- **Frontend:** React + TypeScript + Vite + Tailwind CSS
- **Datos e identidad:** Firebase Authentication + Cloud Firestore
- **Seguridad:** Security Rules de Firestore (negacion por defecto) verificadas con el
  Firebase Emulator Suite
- **Graficos:** Recharts
- **Informes:** jsPDF + jspdf-autotable (generados en el navegador, sin servidor)
- **Pruebas:** Vitest (unitarias) + `@firebase/rules-unit-testing` (reglas de seguridad)
- **Publicacion:** GitHub Actions -> GitHub Pages (contenido estatico)

> **Sin IA y sin automatizacion de decisiones.** Las recomendaciones de desarrollo son
> reglas predefinidas y editables (`src/domain/actionCatalog.ts`). La aplicacion no
> predice el rendimiento, no puntua a las personas y no toma decisiones de contratacion,
> promocion ni despido. Los datos que se comparten son siempre los que la propia persona
> ha declarado y autorizado.

---

## 1. Funcionalidades

| Area | Detalle |
| --- | --- |
| Acceso | Registro e inicio de sesion con correo/contrasena, acceso con Google y restablecimiento de contrasena. |
| Gemelo digital | Titular, resumen profesional, competencies por categoria con nivel 1-5. |
| Mapa visual | Grafico radar por competencia, barras por categoria y comparativa actual/objetivo. |
| Objetivos | Objetivos profesionales con nivel actual, nivel objetivo, fecha y estado. |
| Plan de desarrollo | Acciones sugeridas (catalogo estatico), editables y descartables. |
| Evolucion | Linea temporal de eventos (competencias, niveles, formacion, objetivos). |
| Informes | Informe PDF personal y informe PDF compartido que respeta el alcance del permiso. |
| Compartir | Permiso por organizacion con alcance `resumen` o `completo`, revocable en cualquier momento. |
| RR. HH. | Listado de perfiles autorizados, vista del perfil compartido y descarga del informe. |

### Escala de niveles

| Nivel | Nombre | Descripcion |
| --- | --- | --- |
| 1 | Inicial | Conocimientos teoricos basicos; necesita apoyo y supervision. |
| 2 | Basico | Realiza tareas habituales con poca autonomia. |
| 3 | Autonomo | Trabaja de forma autonoma y aporta criterio propio. |
| 4 | Avanzado | Domina el ambito y transmite buenas practicas. |
| 5 | Referente | Marca la referencia, mentorea y lidera mejoras. |

---

## 2. Estructura del proyecto

```
Gemelo_digital/
├─ .github/workflows/       # CI (pruebas + reglas) y publicacion en GitHub Pages
├─ public/                  # recursos estaticos (favicon)
├─ src/
│  ├─ app/                  # enrutado (HashRouter), RequireAuth y TwinContext
│  ├─ auth/                 # contexto de autenticacion y traduccion de errores
│  ├─ components/
│  │  ├─ charts/            # graficos con Recharts
│  │  ├─ layout/            # AppShell y NavBar
│  │  └─ ui/                # kit de interfaz (botones, formularios, modales...)
│  ├─ data/                 # acceso a Firestore (perfil, gemelo, competencias, ...)
│  ├─ domain/               # logica pura: tipos, escala de niveles, analitica, catalogo
│  ├─ emulator/             # pruebas de las Security Rules con el emulador
│  ├─ firebase/             # inicializacion del SDK web de Firebase
│  ├─ pages/                # pantallas de la aplicacion
│  ├─ pdf/                  # generacion de informes PDF
│  ├─ styles/               # estilos globales y Tailwind
│  └─ test/                 # configuracion y datos de prueba
├─ firestore.rules          # Security Rules (negacion por defecto)
├─ firestore.indexes.json   # indices (no se requieren indices compuestos)
├─ firebase.json            # configuracion del emulador
├─ .env.example             # plantilla de configuracion (no contiene secretos)
└─ vite.config.ts           # configuracion de Vite (BASE_PATH para GitHub Pages)
```

---

## 3. Requisitos

- Node.js 20 o superior (probado con Node 22).
- npm 10 o superior.
- Java 21 o superior **solo** para ejecutar el emulador de Firestore (las pruebas de
  seguridad). Los runners de GitHub Actions ya lo incluyen. Para usar la aplicacion
  no hace falta Java.
- Un proyecto de Firebase con Authentication y Cloud Firestore.
- No hace falta instalar Firebase CLI de forma global: `firebase-tools` viene como
  dependencia de desarrollo y los scripts del `package.json` lo usan directamente.

---

## 4. Instalacion

```bash
cd Gemelo_digital
npm install
cp .env.example .env.local   # en Windows: copy .env.example .env.local
```

Edita `.env.local` con la configuracion de tu proyecto:

```dotenv
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

La configuracion se obtiene en **Firebase console > Project settings (⚙) > Your apps >
Web app > SDK setup and configuration > Config**.

Estos valores son **publicos por diseno** (van dentro del bundle del navegador). La
seguridad no depende de ellos: la proporcionan las Security Rules y la lista de
dominios autorizados del proveedor de identidad. Nunca se colocan credenciales
privadas (`firebase-admin`), claves de servicio ni secretos en el frontend.

> Si faltan las variables, la aplicacion arranca en **modo local**: la interfaz se puede
> recorrer y demostrar, pero sin identificacion ni datos remotos.

Arranque en desarrollo:

```bash
npm run dev
```

---

## 5. Configuracion de Firebase

### 5.1 Authentication

1. Firebase console > **Authentication** > **Get started**.
2. En la pestana **Sign-in method**, activa:
   - **Email/Password** (habilita el registro con correo y contrasena).
   - **Google** (opcional, habilita el acceso con cuenta de Google).
3. En **Settings > Authorized domains**, anade los dominios desde los que se usara la
   aplicacion:
   - `localhost` (ya incluido por defecto).
   - `jlrmaster-creator.github.io` (GitHub Pages).
   - El dominio propio, si lo utilizas.

> Si no habilitas Google, el boton "Continuar con Google" mostrara un aviso explicando
> que el metodo no esta activo.

### 5.2 Cloud Firestore

1. Firebase console > **Firestore Database** > **Create database** (modo produccion o
   modo test, segun la fase).
2. Publica las reglas de seguridad del repositorio:

```bash
npm run deploy:rules   # firebase deploy --only firestore:rules,firestore:indexes
```

El comando usa el proyecto declarado en `.firebaserc` (`gemelo-digital-rrhh`). El
repositorio incluye `firebase-tools` como dependencia de desarrollo, por lo que **no
hay que instalar Firebase CLI de forma global**: `npm run deploy:rules` invoca el
ejecutable local de `node_modules/.bin`. Si usas otro proyecto, cambialo o ejecuta:

```bash
npx firebase use --add           # selecciona el proyecto de forma interactiva
npx firebase deploy --only firestore:rules
```

> `firebase-tools` requiere Java 21 o superior para los emuladores. Para publicar las
> reglas no hace falta Java, pero si la version de Java de tu equipo es anterior, las
> pruebas del emulador (`npm run test:emulator`) no podran ejecutarse.

**Importante:** nunca se publique la base de datos con reglas permisivas. Las reglas
del repositorio negated por defecto y solo permiten lo que corresponde a cada
persona.

### 5.3 Indices

`firestore.indexes.json` esta vacio a proposito: todas las consultas de la aplicacion
(`orderBy` por un unico campo, `array-contains`, consultas por documento y consultas de
grupo de colecciones con un unico filtro) usan indices automaticos. Si en el futuro se
anaden consultas con varios filtros, crea aqui el indice compuesto correspondiente.

---

## 6. Seguridad de los datos

### Modelo de datos

```
users/{uid}                                   perfil de cuenta
digitalTwins/{uid}                            gemelo digital
digitalTwins/{uid}/competencies/{id}          competencias
digitalTwins/{uid}/goals/{id}                 objetivos y plan de desarrollo
digitalTwins/{uid}/history/{id}               historial de evolucion
digitalTwins/{uid}/sharing/{memberUid}        permiso de acceso por persona
organizations/{orgId}                         equipos de RR. HH.
organizations/{orgId}/members/{uid}           miembros y su rol (admin / hr)
invites/{code}                                codigos de incorporacion
```

### Principios

- **Negacion por defecto:** cualquier ruta no contemplada esta denegada.
- **Comprobacion por operacion:** cada lectura y cada escritura valida identidad
  (`request.auth`) y autorizacion.
- **Validacion de contenido:** niveles dentro de 1-5, campos obligatorios, longitudes
  maximas, estados y alcances dentro de una lista cerrada.
- **Separacion entre datos privados y compartidos:** el historial de evolucion solo es
  visible con alcance `completo`.
- **Permisos por persona, no por organizacion:** cada permiso es un documento cuyo
  identificador es el `uid` de quien lo recibe, de modo que la comprobacion en las
  reglas es directa (`exists(...)`) y verificable, sin recorrer listas.
- **Pertenencia a la organizacion en un documento por persona:** el rol (`admin` / `hr`)
  vive en `organizations/{orgId}/members/{uid}`, nunca en una lista del documento de la
  organizacion (Firestore no permite concatenar ni recorrer listas de forma fiable).
- **Revocacion inmediata:** al retirar un permiso se marca `revokedAt` y las reglas
  dejan de dar acceso.

### Pruebas de las reglas

Las Security Rules se validan con el Firebase Emulator Suite (no contra el proyecto
real: el emulador usa el proyecto `demo-gemelo-digital`).

```bash
npm run test:emulator
```

El script levanta los emuladores de Authentication y Firestore, ejecuta las pruebas de
`src/emulator/` y los apaga al terminar. Los casos cubiertos incluyen: persona
anonima, propietario, persona no relacionada, miembro de RR. HH. con permiso, permiso
revocado, alcance `resumen` frente a `completo`, validaciones de contenido,
organizaciones, codigos de invitacion validos e invalidos y negacion por defecto.

Ademas, `src/emulator/integration.test.ts` ejecuta el **codigo real de la aplicacion**
(`src/data`) contra los emuladores: una persona se registra, crea su gemelo digital y
una organizacion; otra se incorpora con el codigo de invitacion; la primera comparte
su perfil y la segunda lo ve desde el area de RR. HH. La prueba se niega a ejecutarse
si el proyecto no es `demo-gemelo-digital`, de modo que nunca toca el proyecto real.

Para levantar los emuladores en segundo plano y depurar con la interfaz web:

```bash
npm run emulators       # http://localhost:4000 (UI del emulador)
```

### Trabajar contra el emulador

La aplicacion puede conectarse a los emuladores locales en lugar de a Firebase. Es la
forma comoda de probar el flujo completo (registro, organizacion, comparticion) sin
escribir en el proyecto real:

```bash
# terminal 1
npm run emulators

# terminal 2
$env:VITE_USE_EMULATOR="true"   # Windows PowerShell
npm run dev
```

En macOS/Linux: `VITE_USE_EMULATOR=true npm run dev`.

---

## 7. Pruebas y calidad

```bash
npm run typecheck      # tsc -b (app, configuracion y pruebas del emulador)
npm run test           # pruebas unitarias (Vitest)
npm run test:watch     # modo interactivo
npm run test:emulator  # pruebas de las Security Rules (requiere Java)
npm run build          # comprobacion de tipos + build de produccion
```

Cobertura de las pruebas unitarias: escala de niveles, analitica (fortalezas, brechas,
progreso de objetivos, comparativa), catalogo de acciones, utilidades de la capa de
datos y generacion de los dos informes PDF (incluye la comprobacion de que el informe
de alcance `resumen` no contiene objetivos ni evolucion).

---

## 8. Publicacion en GitHub Pages

El repositorio ya incluye los workflows necesarios:

- `.github/workflows/deploy.yml` - construye, prueba y publica en GitHub Pages.
- `.github/workflows/ci.yml` - ejecuta comprobaciones y pruebas de seguridad en cada
  `push` y `pull_request`.

### Activar Pages (una sola vez)

1. Sube el proyecto a GitHub (rama `main`).
2. Ve a **Settings > Pages > Build and deployment**.
3. En **Source**, elige **GitHub Actions**.
4. Ejecuta el workflow manualmente (**Actions > Deploy to GitHub Pages > Run
   workflow**) o haz un `push` a `main`.

A partir de ese momento, cada `push` a `main` recompila y publica la aplicacion en:

```
https://<usuario>.github.io/<nombre-del-repositorio>/
```

### Rutas y subcarpetas

La aplicacion usa **HashRouter**, de modo que no necesita ninguna reescritura en el
servidor: cualquier URL copiada (`.../#/competencias`) funciona sin configuracion
adicional.

`vite.config.ts` toma la ruta base de la variable `BASE_PATH`. El workflow la define
como `/<nombre-del-repositorio>/`. Si publicas en un dominio propio, anade la variable
de repositorio `BASE_PATH` con valor `/` en **Settings > Secrets and variables >
Actions > Variables**.

### Variables de Firebase en el workflow

El workflow usa las variables `VITE_FIREBASE_*` con el valor por defecto del proyecto
`gemelo-digital-rrhh`. Para usar otro proyecto, define las variables de repositorio
`VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`,
`VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID` y
`VITE_FIREBASE_APP_ID`; si existen, tienen prioridad sobre los valores por defecto.

---

## 9. Uso de la aplicacion

### Para la persona

1. Crear una cuenta (correo/contrasena o Google).
2. Completar el gemelo digital: titular, resumen y competencias con su nivel.
3. Definir objetivos: nivel actual, nivel objetivo, fecha y estado.
4. Revisar las acciones sugeridas, editarlas o descartarlas y guardarlas.
5. Registrar la evolucion (nuevas competencias, formacion, hitos).
6. Descargar el informe PDF personal desde **Informes**.
7. Compartir con una organizacion desde **Compartir**, eligiendo el alcance.

### Para el personal de RR. HH.

1. Crear una organizacion (quien la crea es su administradora) y compartir el codigo de
   invitacion.
2. Incorporarse a la organizacion introduciendo el codigo.
3. En **RR. HH.**, consultar los perfiles autorizados y descargar el informe
   compartido.

---

## 10. Limites conocidos

- **Sin backend propio:** todo el acceso a datos pasa por el SDK web de Firebase y las
  Security Rules. No hay API intermediaria ni Base de Datos personal.
- **Sin IA:** las acciones sugeridas provienen de un catalogo estatico. No hay modelos,
  ni chamadas a APIs externas de inteligencia artificial, ni envio de datos a terceros.
- **Sin automatizacion de decisiones de personas:** no hay prediccion de rendimiento,
  puntuaciones automatizadas ni flujos de contratacion, promocion o despido.
- **Un permiso por persona y gemelo:** el modelo de comparticion es "persona a
  persona"; una organizacion con muchos miembros genera un permiso por miembro. Es una
  decision consciente: mantiene las reglas simples y verificables.
- **Codigo de invitacion como credencial:** quien tenga el codigo puede incorporarse a
  la organizacion. Se recomienda compartirlo por un canal privado.
- **Retirar a alguien de la organizacion no retira sus permisos ya concedidos:** cada
  permiso lo concede y lo revoca la persona duena del gemelo digital, desde
  **Compartir**.
- **Sin notificaciones en tiempo real:** no hay correos ni avisos automaticos; la
  aplicacion no envia mensajes a la persona duena cuando se comparte su perfil.
- **Sin verificacion de correo ni segundo factor:** la proteccion depende de las
  reglas de la consola de Firebase.
- **Un solo idioma:** la interfaz esta en castellano.
- **Sin edicion colaborativa:** dos personas que editen a la vez el mismo documento
  veran el ultimo cambio guardado.
- **Sin edicion offline completa:** sin conexion se pierde la sesion de Firebase; los
  datos se recargan al recuperar la conexion.
- **Informes en el navegador:** el PDF se genera en el dispositivo y se descarga; no se
  almacena ni se envia a ningun servidor.

---

## 11. Licencia y uso responsable

Codigo abierto con fines de demostracion y uso interno en Recursos Humanos. Los datos
del gemelo digital son **declarados por la propia persona**: la aplicacion no los
verifica. Compartirlos con una organizacion es una decision individual y revocable en
cualquier momento desde **Compartir**.
