# 📚 ExamsAttempts API Documentation

Documentación completa de la API REST para el microservicio de ExamsAttempts.

## 🚀 Acceder a la documentación

Una vez que el servidor esté corriendo, puedes acceder a la documentación interactiva de Swagger en:

```
http://localhost:3002/api/exam/docs
```

### Ver el spec OpenAPI en JSON:
```
http://localhost:3002/api/exam/docs.json
```

## 📖 Endpoints Disponibles

### 🎯 Attempts (Intentos de exámenes)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/api/exam/attempt/start` | Iniciar un nuevo intento de examen |
| `POST` | `/api/exam/attempt/resume` | Reanudar un intento existente |
| `POST` | `/api/exam/attempt/:intento_id/finish` | Finalizar un intento |
| `POST` | `/api/exam/attempt/:intento_id/unlock` | Desbloquear intento (profesor) |
| `POST` | `/api/exam/attempt/:intento_id/abandon` | Abandonar un intento |
| `GET` | `/api/exam/:examId/active-attempts` | Obtener todos los intentos de un examen |
| `GET` | `/api/exam/attempt/:intento_id/details` | Obtener detalles completos de un intento |

### ✍️ Answers (Respuestas)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/api/exam/answer` | Guardar o actualizar una respuesta |

### 📊 Grading (Calificación)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `PATCH` | `/api/exam/answer/:respuesta_id/manual-grade` | Actualizar calificación manual y retroalimentación |

### 🔔 Events (Eventos de seguridad)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/api/exam/event` | Registrar un evento de seguridad |
| `GET` | `/api/exam/attempt/:attemptId/events` | Obtener eventos de un intento |
| `PATCH` | `/api/exam/attempt/:attemptId/events/read` | Marcar eventos como leídos |

## 🔧 Iniciar el servidor

```bash
# Desarrollo
npm run dev

# Desarrollo con hot-reload
npm run dev:hot

# Producción
npm run build
npm start
```

## 📝 DTOs Principales

### StartExamAttemptDto
```json
{
  "codigo_examen": "ABC123",
  "nombre_estudiante": "Juan Pérez",
  "correo_estudiante": "juan@example.com",
  "identificacion_estudiante": "123456",
  "contrasena": "password123"
}
```

### CreateExamAnswerDto
```json
{
  "pregunta_id": 1,
  "respuesta": "[1, 2, 3]",
  "fecha_respuesta": "2026-02-12T22:30:00.000Z",
  "intento_id": 48,
  "retroalimentacion": "Opcional"
}
```

### UpdateManualGradeDto
```json
{
  "puntaje": 4.5,
  "retroalimentacion": "Muy buena respuesta"
}
```

## ✅ Validaciones

### Calificación Manual
- ✅ El puntaje debe ser mayor o igual a 0
- ✅ El puntaje no puede exceder el máximo de la pregunta
- ✅ La retroalimentación es opcional (máximo 1000 caracteres)
- ✅ Recalcula automáticamente el puntaje total del intento

### Estados de Intentos
- `active`: Intento en progreso
- `finished`: Intento finalizado
- `blocked`: Intento bloqueado por fraude
- `abandonado`: Intento abandonado

### Tipos de Eventos
- `cambio_pestana`: Cambio de pestaña
- `pantalla_completa_salida`: Salida de pantalla completa
- `click_derecho`: Click derecho detectado
- `copiar`: Intento de copiar
- `pegar`: Intento de pegar

## 🧪 Testing

El proyecto usa Vitest para testing:

```bash
# Ejecutar tests
npm test

# Ejecutar tests en modo watch
npm run test -- --watch
```

## 📦 Dependencias Principales

- **Express**: Framework web
- **TypeORM**: ORM para base de datos
- **Socket.io**: Comunicación en tiempo real
- **class-validator**: Validación de DTOs
- **swagger-ui-express**: Documentación interactiva
- **swagger-jsdoc**: Generación de OpenAPI spec

## 🔐 WebSockets

El servidor también emite eventos en tiempo real:

### Eventos del estudiante:
- `answer_saved`: Respuesta guardada
- `answer_updated`: Respuesta actualizada
- `attempt_finished`: Intento finalizado
- `attempt_blocked`: Intento bloqueado
- `attempt_unlocked`: Intento desbloqueado
- `time_expired`: Tiempo expirado

### Eventos del profesor:
- `student_started_exam`: Estudiante inició examen
- `student_finished_exam`: Estudiante finalizó examen
- `new_alert`: Nueva alerta de seguridad
- `fraud_alert`: Alerta de fraude
- `grade_updated`: Calificación actualizada
- `progress_updated`: Progreso actualizado

## 📄 Licencia

Este proyecto es parte del sistema WebExams.
