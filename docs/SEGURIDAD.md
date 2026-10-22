# Modelo de seguridad

Este documento explica como se protege la informacion del Gemelo Digital del Talento:
que reglas se aplican, por que se han elegido y como se verifican.

## 1. Frontera de seguridad

La unica frontera de seguridad es el conjunto de **Security Rules de Cloud Firestore**
(`firestore.rules`). Todo lo que se ejecuta en el navegador (la interfaz, los
contextos, las utilidades) es codigo del cliente y, por tanto, no confiable.

La configuracion publica del SDK web (`VITE_FIREBASE_*`) no es un secreto y no protege
nada por si misma. Cambiarla no concede acceso a datos ajenos: las reglas evaluan
siempre la identidad real de la persona (`request.auth`).

## 2. Principios

| Principio | Como se aplica |
| --- | --- |
| Negacion por defecto | Solo lo enumerado en el fichero de reglas esta permitido; el resto cae en `match /{document=**} { allow read, write: if false; }`. |
| Comprobacion por operacion | Cada `allow read` y cada `allow write` comprueba `request.auth` y la relacion con el recurso. |
| Minimo privilegio | Quien recibe un permiso solo puede **leer**; nunca escribir en el gemelo ajeno. |
| Validacion de contenido | Se comprueban tipos, rangos, longitudes y listas cerradas en cada escritura. |
| Separacion de datos | El historial de evolucion exige alcance `completo`. |
| Revocacion inmediata | `revokedAt` deja el permiso sin efecto en la misma lectura de las reglas. |
| Sin secretos en el repositorio | `.env.local` esta en `.gitignore`; solo se versiona `.env.example`. |

## 3. Identidades y permisos

### Tres roles

1. **Dueno del gemelo digital** (`request.auth.uid == twinId`): control total de sus
   datos y unico que puede conceder o retirar permisos.
2. **Miembro de RR. HH. con permiso**: lectura de lo compartido, sin escritura.
3. **Persona sin relacion**: sin acceso.

### Como se materializa el permiso

```
digitalTwins/{duenio}/sharing/{miembroUid} = {
  memberUid, twinId, orgId, orgName, scope, grantedAt, revokedAt
}
```

El identificador del documento es el `uid` de quien recibe el permiso. Esto es
deliberado: las reglas de Firestore **no pueden recorrer listas**, de modo que un
permiso "por organizacion" (guardado como array) obligaria a una comprobacion que
Firestore no puede evaluar de forma fiable. Con un documento por persona la
comprobacion es una llamada directa:

```rules
exists(/databases/$(database)/documents/digitalTwins/$(twinId)/sharing/$(request.auth.uid))
```

y la revocacion se comprueba sobre el propio documento:

```rules
get(/databases/$(database)/documents/digitalTwins/$(twinId)/sharing/$(request.auth.uid)).data.revokedAt == null
```

### Alcances

| Alcance | Competencias | Objetivos | Historial |
| --- | --- | --- | --- |
| `summary` (resumen) | si | si | **no** |
| `full` (completo) | si | si | si |

El alcance se comprueba en la regla de lectura del historial:

```rules
match /history/{eventId} {
  allow read: if isOwner(twinId) || hasFullGrant(twinId);
}
```

## 4. Organizaciones e invitaciones

- `organizations/{orgId}` guarda `name`, `createdBy`, `createdAt` e `inviteCode`.
- `organizations/{orgId}/members/{uid}` guarda la pertenencia de una persona:
  `uid`, `role` (`admin` o `hr`), `email`, `orgName`, `orgCreatedAt`, `addedAt` y el
  `inviteCode` con el que se incorporo.
- `invites/{code}` es la credencial de incorporacion: una collection de primer nivel
  que se puede leer sin conocer la organizacion (si no, no se podriaIncorporar a
  ella).

La pertenencia se registra en **un documento por persona** y no en una lista dentro
del documento de la organizacion. Es una decision forzada por el lenguaje de
reglas: Firestore no permite concatenar listas (`resource.data.memberIds + [uid]`
no es una operacion valida) ni recorrerlas de forma fiable, de modo que una lista
de miembros exigiria una regla que un miembro podria falsear en su propio
beneficio. Con un documento por persona la pertenencia y el rol se comprueban
siempre con llamadas directas:

```rules
function isOrgMember(orgId) {
  return isSignedIn()
    && exists(/databases/$(database)/documents/organizations/$(orgId)/members/$(request.auth.uid));
}

function isOrgAdmin(orgId) {
  return isOrgMember(orgId)
    && get(/databases/$(database)/documents/organizations/$(orgId)/members/$(request.auth.uid)).data.role == 'admin';
}
```

Reglas relevantes:

- Crear la organizacion exige `createdBy == request.auth.uid`: quien la crea es su
  unico miembro inicial y su unica administradora.
- Publicar un codigo exige ser administradora de esa organizacion.
- Incorporarse exige un codigo valido **para esa organizacion** y crea unicamente
  el documento de miembro (nunca modifica el documento de la organizacion):

```rules
exists(/databases/$(database)/documents/invites/$(code))
&& get(/databases/$(database)/documents/invites/$(code)).data.orgId == orgId
```

- Una administradora no puede cambiar su propio rol ni eliminarse: evita quedar la
  organizacion sin administracion por un error.

### Consultas de grupo de colecciones

La vista de RR. HH. necesita dos listados que cruzan colecciones: los permisos
recibidos (`sharing`) y las organizaciones a las que pertenece la persona
(`members`). Para no duplicar datos se resuelven con consultas de *collection
group*, que en Firestore solo evaluan reglas con **comodin recursivo**:

```rules
match /{path=**}/sharing/{memberUid} {
  allow read: if isSignedIn() && resource.data.memberUid == request.auth.uid;
}

match /{path=**}/members/{memberUid} {
  allow read: if isSignedIn() && resource.data.uid == request.auth.uid;
}
```

Cada persona lista unicamente sus propios documentos: el resto de la
organizacion y el resto de permisos siguen sin ser legibles. El campo por el que
se filtra (`memberUid` / `uid`) lo escribe siempre el cliente con el mismo valor
que el identificador del documento.

## 5. Validaciones de contenido

| Coleccion | Validaciones |
| --- | --- |
| `users/{uid}` | `displayName` y `jobTitle` de texto, hasta 120 caracteres. |
| `digitalTwins/{uid}` | `userId == twinId`, `headline` (140), `summary` (2000). |
| `competencies/{id}` | `name` (2-120), `category` (80), `description` (1000), `level` entero entre 1 y 5. |
| `goals/{id}` | `title` (3-140), `description` (1000), niveles 1-5, `targetLevel >= currentLevel`, `targetDate` (20), `status` en lista cerrada, `actions` como lista de hasta 50 elementos. |
| `history/{id}` | `title` (3-160), `description` (1000), `type` en lista cerrada. |
| `sharing/{memberUid}` | `memberUid == memberUid` del documento, `twinId == twinId`, `scope` en `['full','summary']`. |
| `organizations/{orgId}` | `name` (3-120), `createdBy == request.auth.uid` en la creacion. |
| `organizations/{orgId}/members/{uid}` | `uid == memberUid`, `role` en `['admin','hr']`, `orgName` (1-120) y, en la incorporacion, `inviteCode` valido para esa organizacion. |

## 6. Verificacion

Las reglas se prueban contra el **Firebase Emulator Suite**, nunca contra el proyecto
real (el emulador usa el identificador `demo-gemelo-digital`):

```bash
npm run test:emulator
```

Casos cubiertos en `src/emulator/`:

| Fichero | Escenarios |
| --- | --- |
| `twin.test.ts` | Anonimo, propietario, persona no relacionada, suplantacion de `userId`, niveles fuera de rango, campos obligatorios, negacion por defecto. |
| `sharing.test.ts` | Concesion de permisos, lectura del permiso propio y de otros, alcance `summary` frente a `full`, revocacion y renovacion. |
| `organizations.test.ts` | Creacion de organizacion, incorporacion con codigo valido, codigo invalido o de otra organizacion, cambio de rol, proteccion de la administradora, listado de organizaciones propias y negativa al listado de las ajenas. |
| `integration.test.ts` | Flujo completo con el codigo real de la aplicacion (`src/data`) contra el emulador: registro, alta de organizacion, incorporacion, comparticion y lectura desde RR. HH., mas los intentos de acceso no autorizado. |

La prueba de integracion aborta si el proyecto no es `demo-gemelo-digital`: nunca debe
ejecutarse contra el proyecto real de Firebase.

El workflow `.github/workflows/ci.yml` ejecuta estas pruebas en cada `push` y en cada
`pull_request`.

## 7. Publicacion de las reglas

```bash
npm run deploy:rules
```

El repositorio incluye `firebase-tools` como dependencia de desarrollo, asi que no hace
falta instalar nada globalmente: `npm run deploy:rules` usa el ejecutable local
(`node_modules/.bin/firebase`). Requiere haber iniciado sesion con
`firebase login` y tener permisos de administrador en el proyecto `gemelo-digital-rrhh`
declarado en `.firebaserc`.

Conviene publicarlas **antes** de abrir la aplicacion a personas reales: durante el
desarrollo, el emulador y las reglas del repositorio son la referencia.

## 8. Que queda fuera del alcance

- La aplicacion no valida que los datos declarados sean ciertos.
- No hay verificacion de correo, segundo factor ni limites de sesion advanced.
- El codigo de invitacion es una credencial: quien lo obtiene puede incorporarse a la
  organizacion. Se recomienda compartirlo por un canal privado y renovarlo si se filtra.
  El codigo queda anotado en el documento de miembro para poder auditar como se produjo
  la incorporacion, de modo que las personas de la organizacion pueden conocerlo.
- Retirar a una persona de la organizacion no retira los permisos que ya habia
  concedido sobre un gemelo digital: cada permiso lo concede y lo revoca su
  propietario.
- Los datos compartidos son visibles para la persona duena en cualquier momento; la
  aplicacion no notifica a la persona cuando su perfil se consulta.
