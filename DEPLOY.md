# Guía de despliegue — WebExams

Despliegue del proyecto en un servidor Linux usando **Docker Compose**. Probado en Ubuntu 22.04 / Debian 12.

---

## Arquitectura

```
                    ┌──────────────────────┐
                    │  Internet (80/443)   │
                    └──────────┬───────────┘
                               │
                       ┌───────▼────────┐
                       │  Nginx (host)  │  ← maneja SSL con certbot
                       └───────┬────────┘
                               │  proxy_pass
                               │  127.0.0.1:8080
            ╭──────────────────┴──────────────────╮
            │       Docker Compose stack          │
            │  ┌────────────────────────────────┐ │
            │  │  Nginx interno (puerto 80)     │ │
            │  │  • sirve client/dist (estático)│ │
            │  │  • proxy a APIs internas       │ │
            │  └──┬───────┬─────────┬───────────┘ │
            │     │       │         │             │
            │  ┌──▼──┐ ┌──▼──┐  ┌──▼─────┐        │
            │  │users│ │exams│  │attempts│        │
            │  │3000 │ │3001 │  │  3002  │        │
            │  └──┬──┘ └──┬──┘  └────┬───┘        │
            │     │       │          │            │
            │     └───────┼──────────┘            │
            │             │                       │
            │      ┌──────▼─────┐                 │
            │      │   MySQL    │ ← volume persistente
            │      │   8.0      │                 │
            │      └────────────┘                 │
            ╰─────────────────────────────────────╯
                  ↑                ↑
                  │                │
            mysql_data       uploads_data
            (volume)         (volume — imágenes/PDFs)
```

**Componentes:**
- 3 microservicios Node 20 + Express + TypeORM (Users, Exams, ExamsAttempts)
- 1 frontend React/Vite (build estático servido por Nginx interno)
- 1 MySQL 8.0
- 2 Nginx (uno interno al stack, uno en el host con SSL)

**Lo único que se instala en el host:** Docker, Node (para hacer build del front), Nginx, certbot.

---

## Quick start (deploy completo en ~10 minutos)

```bash
# 1. En el servidor: clona y prepara
git clone <url-de-tu-repo> /opt/webexams
cd /opt/webexams
bash deploy/setup-server.sh                  # instala Docker, Node, Nginx, certbot
# Cierra y reabre la sesión SSH para que el grupo docker tenga efecto

# 2. Configura secrets
cp .env.example .env
nano .env                                    # pon tus credenciales reales

# 3. Deploy
make deploy                                  # build + frontend + up

# 4. Nginx del host + SSL
sudo cp deploy/nginx-host.conf.example /etc/nginx/sites-available/webexams
sudo nano /etc/nginx/sites-available/webexams   # reemplaza tu-dominio.com
sudo ln -sf /etc/nginx/sites-available/webexams /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d tu-dominio.com
```

Listo. La app debería estar accesible en `https://tu-dominio.com`.

---

## 1. Preparar el servidor

```bash
git clone <url-de-tu-repo> /opt/webexams
cd /opt/webexams
bash deploy/setup-server.sh
```

El script instala: Docker Engine + Compose plugin, Node.js 20, Nginx, certbot, git, make.

**Importante:** después de correr el script, cierra y reabre tu sesión SSH. El usuario actual queda en el grupo `docker` solo después de ese reinicio de sesión.

---

## 2. Configurar variables de entorno

Copia el template y edítalo:

```bash
cd /opt/webexams
cp .env.example .env
nano .env
```

**Variables que DEBES cambiar:**

| Variable | Cómo generar |
|---|---|
| `DB_ROOT_PASSWORD` | `openssl rand -hex 16` |
| `DB_PASS` | `openssl rand -hex 16` |
| `JWT_SECRET` | `openssl rand -hex 64` |
| `SERVICE_SECRET` | `openssl rand -hex 32` |
| `FRONTEND_URL` | tu dominio, ej. `https://exams.unibague.edu.co` |
| `RESEND_API_KEY` + `SMTP_FROM` | ver sección **4.2** |
| `FIREBASE_*` | ver sección **4.1** |

> `.env` está en `.gitignore` — nunca se sube al repo.

---

## 3. Hacer el deploy

```bash
make deploy
```

Eso ejecuta tres pasos:
1. **`make frontend-build`** → instala deps de `client/` y corre `npm run build` (genera `client/dist/`)
2. **`make build`** → construye las imágenes Docker de los 3 microservicios
3. **`make up`** → levanta el stack (mysql + 3 servicios + nginx interno)

Verifica que todo está corriendo:

```bash
make ps        # debe mostrar 5 containers en estado "Up" (sano)
make logs      # logs en vivo de todos los servicios
```

En el primer arranque MySQL crea las 3 BDs automáticamente vía [docker/mysql-init/01-databases.sql](docker/mysql-init/01-databases.sql), y TypeORM (con `synchronize: true`) crea las tablas desde las entidades.

---

## 4. Configuración de servicios externos

### 4.1. Firebase (login con Google)

Firebase Auth se usa **solo** para login con cuenta de Google. Si decides mantenerlo, configura tus propias credenciales por seguridad.

#### Crear el proyecto Firebase

1. Entra a [https://console.firebase.google.com](https://console.firebase.google.com).
2. Crea un proyecto (o usa uno existente).
3. **Authentication → Sign-in method**: habilita **Google**.
4. **Authentication → Settings → Authorized domains**: agrega `tu-dominio.com`.

#### Credenciales del cliente (frontend)

**Project settings → General → Your apps → Web app** → copia la config y pégala en [client/.env](client/.env):

```env
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=tu-proyecto
VITE_FIREBASE_STORAGE_BUCKET=tu-proyecto.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

Luego rebuilda el frontend: `make frontend-build`.

> Estas claves son **públicas por diseño**. La seguridad de Firebase la da el "authorized domain", no el secreto de las claves.

#### Credenciales del backend (Admin SDK)

**Project settings → Service accounts → Generate new private key** descarga un JSON.

Extrae los 3 campos al archivo `.env` del root:

```env
FIREBASE_PROJECT_ID=tu-proyecto
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@tu-proyecto.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvwI...\n-----END PRIVATE KEY-----\n"
```

⚠️ **Críticos al pegar `FIREBASE_PRIVATE_KEY`:**
- Mantén las comillas dobles `"..."` que envuelven todo
- Mantén los `\n` como dos caracteres literales (NO los reemplaces por saltos de línea reales)

Después: `make restart` para que Users tome los nuevos valores.

#### Archivos involucrados (referencia)

| Archivo | Rol |
|---|---|
| [.env](.env) (raíz) | Vars de Firebase Admin SDK que docker-compose inyecta al container Users |
| [client/.env](client/.env) | Vars `VITE_FIREBASE_*` del cliente |
| [client/src/firebase.ts](client/src/firebase.ts) | Inicialización SDK web |
| [client/src/pages/LoginPage.tsx](client/src/pages/LoginPage.tsx) | Botón "Iniciar con Google" |
| [server/Users/src/firebase-admin.ts](server/Users/src/firebase-admin.ts) | Init Admin SDK |
| [server/Users/src/services/UsersService.ts](server/Users/src/services/UsersService.ts) | `loginConGoogle()` valida el token |

#### Eliminar Firebase (alternativa)

Si NO quieres login con Google, lo eliminamos y queda solo email/password local. Trabajo: ~4-6 archivos. Avísame si quieres ir por ahí.

---

### 4.2. Resend (envío de calificaciones por email)

Resend manda automáticamente los resultados a los estudiantes al finalizar un examen.

#### Obtener API key

1. Crea cuenta en [https://resend.com](https://resend.com) — gratis 3000 emails/mes.
2. **Domains** → verifica tu dominio creando los registros DNS que te indica (SPF, DKIM, MX).
3. **API Keys → Create API Key**, copia el valor `re_xxxxxxxx`.

> Sin dominio verificado solo puedes enviar desde `onboarding@resend.dev` (útil para pruebas, no para prod).

#### Configurar

En `.env` del root del proyecto:

```env
RESEND_API_KEY=re_TU_API_KEY_AQUI
SMTP_FROM=noreply@tu-dominio-verificado.com
```

Después: `make restart`.

#### Archivos involucrados (referencia)

| Archivo | Rol |
|---|---|
| [.env](.env) (raíz) | `RESEND_API_KEY`, `SMTP_FROM` que docker-compose inyecta a ExamsAttempts |
| [server/ExamsAttempts/src/services/EmailService.ts](server/ExamsAttempts/src/services/EmailService.ts) | Cliente Resend, envía el email |
| [server/ExamsAttempts/src/services/ScoringService.ts](server/ExamsAttempts/src/services/ScoringService.ts) | Llama al EmailService al calcular notas |

#### Alternativas

- **SMTP propio (nodemailer + Postfix)**: cero dependencias externas. Trabajo ~2-3h, riesgo de spam si no configuras DKIM/SPF/DMARC bien.
- **SendGrid, Mailgun, AWS SES**: refactor del EmailService (~1h).
- **Desactivar emails**: las notas se ven solo en la UI. Trabajo: ~5 min.

---

## 5. Nginx del host + SSL

El stack Docker expone el Nginx interno en `127.0.0.1:8080`. El Nginx del host le hace proxy y maneja SSL con certbot.

```bash
# Instalar config
sudo cp deploy/nginx-host.conf.example /etc/nginx/sites-available/webexams
sudo nano /etc/nginx/sites-available/webexams   # reemplaza tu-dominio.com (2 lugares)
sudo ln -sf /etc/nginx/sites-available/webexams /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Validar y recargar
sudo nginx -t && sudo systemctl reload nginx

# SSL gratis con Let's Encrypt
sudo certbot --nginx -d tu-dominio.com -d www.tu-dominio.com
```

Certbot edita el archivo automáticamente, agrega el bloque `listen 443 ssl` y configura renovación automática.

### Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'   # 80 + 443
sudo ufw --force enable
```

Los puertos 3000–3002 y 3306 (MySQL) **no** se exponen al exterior — solo viven en la red interna de Docker.

---

## Operaciones comunes (Makefile)

```bash
make help          # lista todos los comandos disponibles

# Ciclo normal
make ps            # ver estado
make logs          # logs en vivo
make logs-exams    # logs solo de un servicio
make restart       # reinicia los containers
make down          # detiene el stack (sin borrar volúmenes)
make up            # vuelve a levantar

# Actualizar a una nueva versión
make update        # git pull + frontend build + rebuild + restart

# Backups
make backup        # genera backups/db-FECHA.sql.gz + uploads-FECHA.tar.gz
make restore FILE=backups/db-2026-04-30.sql.gz

# Acceso a containers
make shell-mysql   # cliente MySQL (root)
make shell-exams   # shell dentro del container exams

# Limpieza completa (DESTRUCTIVO — borra volúmenes y datos)
make clean
```

### Backups automáticos (cron diario)

```bash
sudo tee /etc/cron.daily/backup-webexams > /dev/null <<'EOF'
#!/bin/bash
cd /opt/webexams && make backup >> /var/log/webexams-backup.log 2>&1
find /opt/webexams/backups -mtime +14 -delete
EOF
sudo chmod +x /etc/cron.daily/backup-webexams
```

---

## Troubleshooting

### Los containers no arrancan
```bash
make logs       # ver causa
make ps         # estado de health checks
docker compose config   # validar el yaml
```

### El frontend no carga (404)
- Confirma que `client/dist/` existe: `ls -la client/dist/index.html`
- Si no existe: `make frontend-build`

### Imágenes/PDFs no aparecen tras subir
- Verifica el volumen: `docker volume inspect webexams_uploads_data`
- Logs del servicio Exams: `make logs-exams` — busca `✅ Imagen guardada en disco`
- Debe existir el directorio dentro del container: `docker compose exec exams ls /app/uploads/images`

### MySQL no acepta conexiones desde los servicios
- Verifica que el health check de mysql pasa: `docker compose ps mysql` (debe decir `healthy`)
- Las tablas no se crean → confirma que las DBs sí existen: `make shell-mysql` → `SHOW DATABASES;`

### "Error al validar el examen" / 500 en check-duplicate
- `JWT_SECRET` y `SERVICE_SECRET` deben ser idénticos en los 3 servicios. Como aquí los tomamos del mismo `.env` raíz, este error no debería ocurrir, pero verifica con `docker compose config` que las vars se inyectan bien.

### Cambios en código no se reflejan
- Recuerda que `make up` no rebuilda. Usa `make build && make up` o `make update`.
- Para cambios solo del frontend: `make frontend-build` (no necesitas reiniciar containers, Nginx sirve el dist).

### El email no se envía
- Verifica que el dominio en Resend esté verificado (todos los DNS records OK)
- El `SMTP_FROM` debe ser de ese dominio verificado
- Logs: `make logs-attempts` — busca errores de Resend

---

## Migrar desde Vercel + Railway (o similar)

Si actualmente tienes el frontend en Vercel y el backend en otro proveedor:

1. **Backup de datos en el proveedor actual** (export de BD + descarga de uploads si Cloudinary los tenía).
2. **Sigue el Quick Start** arriba.
3. **Restaura los datos**:
   ```bash
   gunzip -c backup-vercel.sql.gz | make shell-mysql
   # uploads: cópialos a /var/lib/docker/volumes/webexams_uploads_data/_data/
   ```
4. **Apunta el DNS** a la IP de tu nuevo servidor Linux.
5. **Apaga los servicios viejos** (Vercel project, etc.) cuando confirmes que todo funciona.

---

## Estructura de archivos relevante

```
WebExams/
├── docker-compose.yml                 ← orquestación
├── Makefile                            ← comandos de uso diario
├── .env.example                        ← template de configuración
├── .env                                ← (no versionado) tus secrets reales
├── docker/
│   ├── nginx/default.conf              ← config Nginx INTERNO (en container)
│   └── mysql-init/01-databases.sql     ← crea las 3 BDs al primer arranque
├── deploy/
│   ├── setup-server.sh                 ← instala Docker, Node, Nginx en el server
│   └── nginx-host.conf.example         ← config Nginx del HOST (proxy + SSL)
├── server/
│   ├── Users/{Dockerfile,.dockerignore,...}
│   ├── Exams/{Dockerfile,.dockerignore,...}
│   └── ExamsAttempts/{Dockerfile,.dockerignore,...}
└── client/
    └── dist/                           ← (generado) servido por Nginx
```
