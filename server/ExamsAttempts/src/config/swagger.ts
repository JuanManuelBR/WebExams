import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ExamsAttempts API',
      version: '1.0.0',
      description: 'API para gestionar intentos de exámenes, respuestas, eventos y calificaciones',
      contact: {
        name: 'WebExams Team',
      },
    },
    servers: [
      {
        url: 'http://localhost:3002',
        description: 'Servidor de desarrollo',
      },
    ],
    tags: [
      {
        name: 'Attempts',
        description: 'Gestión de intentos de exámenes',
      },
      {
        name: 'Answers',
        description: 'Gestión de respuestas de estudiantes',
      },
      {
        name: 'Events',
        description: 'Gestión de eventos de seguridad',
      },
      {
        name: 'Grading',
        description: 'Calificación manual de respuestas',
      },
    ],
    components: {
      schemas: {
        // DTOs
        StartExamAttemptDto: {
          type: 'object',
          required: ['codigo_examen'],
          properties: {
            codigo_examen: {
              type: 'string',
              description: 'Código del examen',
              example: 'ABC123',
            },
            nombre_estudiante: {
              type: 'string',
              description: 'Nombre completo del estudiante',
              example: 'Juan Pérez',
            },
            correo_estudiante: {
              type: 'string',
              format: 'email',
              description: 'Correo electrónico del estudiante',
              example: 'juan.perez@example.com',
            },
            identificacion_estudiante: {
              type: 'string',
              description: 'Código o identificación del estudiante',
              example: '123456',
            },
            contrasena: {
              type: 'string',
              description: 'Contraseña del examen (si es requerida)',
              example: 'password123',
            },
          },
        },
        ResumeExamAttemptDto: {
          type: 'object',
          required: ['codigo_acceso', 'id_sesion'],
          properties: {
            codigo_acceso: {
              type: 'string',
              description: 'Código de acceso del intento',
              example: 'XYZ789',
            },
            id_sesion: {
              type: 'string',
              description: 'ID de sesión único',
              example: 'session-uuid-123',
            },
          },
        },
        CreateExamAnswerDto: {
          type: 'object',
          required: ['pregunta_id', 'respuesta', 'fecha_respuesta', 'intento_id'],
          properties: {
            pregunta_id: {
              type: 'number',
              description: 'ID de la pregunta',
              example: 1,
            },
            respuesta: {
              type: 'string',
              description: 'Respuesta del estudiante (puede ser JSON string)',
              example: '[1, 2, 3]',
            },
            fecha_respuesta: {
              type: 'string',
              format: 'date-time',
              description: 'Fecha y hora de la respuesta',
              example: '2026-02-12T22:30:00.000Z',
            },
            intento_id: {
              type: 'number',
              description: 'ID del intento',
              example: 48,
            },
            retroalimentacion: {
              type: 'string',
              description: 'Retroalimentación opcional del profesor (máx 1000 caracteres)',
              example: 'Excelente respuesta',
            },
          },
        },
        CreateExamEventDto: {
          type: 'object',
          required: ['tipo_evento', 'fecha_envio', 'intento_id'],
          properties: {
            tipo_evento: {
              type: 'string',
              enum: ['cambio_pestana', 'pantalla_completa_salida', 'click_derecho', 'copiar', 'pegar'],
              description: 'Tipo de evento de seguridad',
              example: 'cambio_pestana',
            },
            fecha_envio: {
              type: 'string',
              format: 'date-time',
              description: 'Fecha y hora del evento',
              example: '2026-02-12T22:30:00.000Z',
            },
            intento_id: {
              type: 'number',
              description: 'ID del intento',
              example: 48,
            },
          },
        },
        UpdateManualGradeDto: {
          type: 'object',
          properties: {
            puntaje: {
              type: 'number',
              minimum: 0,
              description: 'Puntaje asignado manualmente (no puede ser negativo ni exceder el máximo de la pregunta)',
              example: 4.5,
            },
            retroalimentacion: {
              type: 'string',
              maxLength: 1000,
              description: 'Retroalimentación del profesor (máx 1000 caracteres)',
              example: 'Muy buena respuesta, pero podrías profundizar más en el segundo punto.',
            },
          },
        },
        // Responses
        ExamAnswer: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'ID de la respuesta',
              example: 60,
            },
            pregunta_id: {
              type: 'number',
              description: 'ID de la pregunta',
              example: 37,
            },
            respuesta: {
              type: 'string',
              description: 'Respuesta del estudiante',
              example: '[30,29]',
            },
            fecha_respuesta: {
              type: 'string',
              format: 'date-time',
              description: 'Fecha de la respuesta',
              example: '2026-02-12T22:05:28.000Z',
            },
            intento_id: {
              type: 'number',
              description: 'ID del intento',
              example: 48,
            },
            puntaje: {
              type: 'number',
              nullable: true,
              description: 'Puntaje obtenido',
              example: 1,
            },
            retroalimentacion: {
              type: 'string',
              nullable: true,
              description: 'Retroalimentación del profesor',
              example: 'Excelente trabajo',
            },
          },
        },
        ExamAttempt: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'ID del intento',
              example: 48,
            },
            examen_id: {
              type: 'number',
              description: 'ID del examen',
              example: 19,
            },
            estado: {
              type: 'string',
              enum: ['active', 'finished', 'blocked', 'abandonado'],
              description: 'Estado del intento',
              example: 'finished',
            },
            nombre_estudiante: {
              type: 'string',
              nullable: true,
              description: 'Nombre del estudiante',
              example: 'Juan Pérez',
            },
            correo_estudiante: {
              type: 'string',
              nullable: true,
              description: 'Correo del estudiante',
              example: 'juan@example.com',
            },
            identificacion_estudiante: {
              type: 'string',
              nullable: true,
              description: 'Identificación del estudiante',
              example: '123456',
            },
            fecha_inicio: {
              type: 'string',
              format: 'date-time',
              description: 'Fecha de inicio',
              example: '2026-02-12T22:05:25.000Z',
            },
            fecha_fin: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              description: 'Fecha de finalización',
              example: '2026-02-12T22:05:28.000Z',
            },
            puntaje: {
              type: 'number',
              nullable: true,
              description: 'Puntaje total obtenido',
              example: 8.5,
            },
            puntajeMaximo: {
              type: 'number',
              description: 'Puntaje máximo posible',
              example: 10,
            },
            porcentaje: {
              type: 'number',
              nullable: true,
              description: 'Porcentaje obtenido (0-100)',
              example: 85,
            },
            notaFinal: {
              type: 'number',
              nullable: true,
              description: 'Nota final (escala 0-5)',
              example: 4.25,
            },
            progreso: {
              type: 'number',
              description: 'Porcentaje de progreso (0-100)',
              example: 100,
            },
          },
        },
        AttemptDetails: {
          type: 'object',
          properties: {
            intento: {
              type: 'object',
              properties: {
                id: { type: 'number', example: 50 },
                examen_id: { type: 'number', example: 20 },
                estado: { type: 'string', enum: ['active', 'finished', 'blocked', 'abandonado'], example: 'finished' },
                nombre_estudiante: { type: 'string', nullable: true, example: 'Juan Pérez' },
                correo_estudiante: { type: 'string', nullable: true, example: 'juan@example.com' },
                identificacion_estudiante: { type: 'string', nullable: true, example: '123456' },
                fecha_inicio: { type: 'string', format: 'date-time', example: '2026-02-12T22:24:22.000Z' },
                fecha_fin: { type: 'string', format: 'date-time', nullable: true, example: '2026-02-12T22:24:32.000Z' },
                limiteTiempoCumplido: { type: 'string', nullable: true, example: 'enviar' },
                consecuencia: { type: 'string', example: 'ninguna' },
                puntaje: { type: 'number', nullable: true, example: 3.83 },
                puntajeMaximo: { type: 'number', example: 10 },
                porcentaje: { type: 'number', nullable: true, example: 38.33 },
                notaFinal: { type: 'number', nullable: true, example: 1.92 },
                progreso: { type: 'number', example: 100 },
              },
            },
            examen: {
              type: 'object',
              properties: {
                id: { type: 'number', example: 20 },
                nombre: { type: 'string', example: 'Examen de Prueba' },
                descripcion: { type: 'string', example: '<p>Descripción del examen</p>' },
                codigoExamen: { type: 'string', example: '6UGNQHWo' },
                estado: { type: 'string', example: 'open' },
                nombreProfesor: { type: 'string', example: 'Dr. García' },
              },
            },
            estadisticas: {
              type: 'object',
              properties: {
                totalPreguntas: { type: 'number', example: 4 },
                preguntasRespondidas: { type: 'number', example: 4 },
                preguntasCorrectas: { type: 'number', example: 1 },
                preguntasIncorrectas: { type: 'number', example: 3 },
                preguntasSinResponder: { type: 'number', example: 0 },
                tiempoTotal: { type: 'number', description: 'Tiempo en segundos', example: 10 },
              },
            },
            preguntas: {
              type: 'array',
              description: 'Array de preguntas con diferentes formatos según el tipo',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'number', example: 38 },
                  enunciado: { type: 'string', example: '¿Cuál es la capital de Colombia?' },
                  type: { type: 'string', enum: ['test', 'open', 'fill_blanks', 'match'], example: 'test' },
                  puntajeMaximo: { type: 'number', example: 2 },
                  calificacionParcial: { type: 'boolean', example: false },
                  nombreImagen: { type: 'string', nullable: true, example: null },
                  respuestaEstudiante: {
                    type: 'object',
                    nullable: true,
                    description: 'Información de la respuesta del estudiante',
                    properties: {
                      id: { type: 'number', example: 65 },
                      respuestaParsed: {
                        description: 'Respuesta parseada - tipo varía según pregunta (array de IDs para test, string para open, array de strings para fill_blanks, array de objetos para match)',
                      },
                      puntajeObtenido: { type: 'number', example: 2 },
                      fecha_respuesta: { type: 'string', format: 'date-time', example: '2026-02-12T22:24:24.000Z' },
                      retroalimentacion: { type: 'string', nullable: true, example: 'Excelente trabajo' },
                    },
                  },
                },
                description: 'Campos adicionales según el tipo de pregunta: opciones (test), textoEscrito (open), espaciosLlenados (fill_blanks), paresSeleccionados (match)',
              },
              example: [
                {
                  id: 41,
                  enunciado: '¿Cuál es la capital de Colombia?',
                  type: 'test',
                  puntajeMaximo: 2,
                  calificacionParcial: false,
                  nombreImagen: null,
                  respuestaEstudiante: {
                    id: 65,
                    respuestaParsed: [31],
                    puntajeObtenido: 0,
                    fecha_respuesta: '2026-02-12T22:24:24.000Z',
                    retroalimentacion: null,
                    opcionesSeleccionadas: [
                      { id: 31, texto: 'Medellín', esCorrecta: false },
                    ],
                  },
                  opciones: [
                    { id: 31, texto: 'Medellín' },
                    { id: 32, texto: 'Bogotá' },
                    { id: 33, texto: 'Cali' },
                    { id: 34, texto: 'Cartagena' },
                  ],
                  cantidadRespuestasCorrectas: 1,
                },
                {
                  id: 40,
                  enunciado: 'Explique brevemente qué es la programación orientada a objetos',
                  type: 'open',
                  puntajeMaximo: 3,
                  calificacionParcial: true,
                  nombreImagen: null,
                  respuestaEstudiante: {
                    id: 68,
                    respuestaParsed: 'La POO es un paradigma...',
                    puntajeObtenido: 3,
                    fecha_respuesta: '2026-02-12T22:24:32.000Z',
                    retroalimentacion: 'Excelente explicación',
                    textoEscrito: 'La POO es un paradigma...',
                  },
                },
                {
                  id: 39,
                  enunciado: 'Complete la siguiente frase sobre desarrollo web',
                  type: 'fill_blanks',
                  puntajeMaximo: 2.5,
                  calificacionParcial: true,
                  nombreImagen: 'image.webp',
                  respuestaEstudiante: {
                    id: 66,
                    respuestaParsed: ['estructura', 'estilo', 'comportamiento'],
                    puntajeObtenido: 2.5,
                    fecha_respuesta: '2026-02-12T22:24:28.000Z',
                    retroalimentacion: null,
                    espaciosLlenados: [
                      { posicion: 0, respuestaEstudiante: 'estructura', respuestaCorrecta: 'estructura', esCorrecta: true },
                      { posicion: 1, respuestaEstudiante: 'estilo', respuestaCorrecta: 'estilo', esCorrecta: true },
                      { posicion: 2, respuestaEstudiante: 'comportamiento', respuestaCorrecta: 'comportamiento', esCorrecta: true },
                    ],
                  },
                  textoCorrecto: 'HTML define la ___ de la página, CSS define el ___ y JavaScript define el ___',
                  respuestasCorrectas: [
                    { id: 16, posicion: 0, textoCorrecto: 'estructura' },
                    { id: 17, posicion: 1, textoCorrecto: 'estilo' },
                    { id: 18, posicion: 2, textoCorrecto: 'comportamiento' },
                  ],
                },
                {
                  id: 38,
                  enunciado: 'Relacione cada lenguaje de programación con su tipo principal',
                  type: 'match',
                  puntajeMaximo: 2.5,
                  calificacionParcial: true,
                  nombreImagen: null,
                  respuestaEstudiante: {
                    id: 67,
                    respuestaParsed: [
                      { itemA_id: 41, itemB_id: 41 },
                      { itemA_id: 42, itemB_id: 42 },
                      { itemA_id: 43, itemB_id: 43 },
                    ],
                    puntajeObtenido: 2.5,
                    fecha_respuesta: '2026-02-12T22:24:32.000Z',
                    retroalimentacion: null,
                    paresSeleccionados: [
                      {
                        itemA: { id: 41, text: 'Python' },
                        itemB: { id: 41, text: 'Interpretado' },
                        esCorrecto: true,
                      },
                      {
                        itemA: { id: 42, text: 'Java' },
                        itemB: { id: 42, text: 'Compilado' },
                        esCorrecto: true,
                      },
                      {
                        itemA: { id: 43, text: 'JavaScript' },
                        itemB: { id: 43, text: 'Interpretado' },
                        esCorrecto: true,
                      },
                    ],
                  },
                  paresCorrectos: [
                    { id: 41, itemA: { id: 41, text: 'Python' }, itemB: { id: 41, text: 'Interpretado' } },
                    { id: 42, itemA: { id: 42, text: 'Java' }, itemB: { id: 42, text: 'Compilado' } },
                    { id: 43, itemA: { id: 43, text: 'JavaScript' }, itemB: { id: 43, text: 'Interpretado' } },
                  ],
                },
              ],
            },
            eventos: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'number', example: 1 },
                  tipo_evento: { type: 'string', example: 'cambio_pestana' },
                  fecha_envio: { type: 'string', format: 'date-time', example: '2026-02-12T22:05:28.000Z' },
                  leido: { type: 'boolean', example: false },
                },
              },
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Mensaje de error',
              example: 'Respuesta no encontrada',
            },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

const swaggerSpec = swaggerJsdoc(options);

export const setupSwagger = (app: Express): void => {
  app.use('/api/exam/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'ExamsAttempts API Docs',
    customCss: '.swagger-ui .topbar { display: none }',
  }));

  // Endpoint para obtener el spec en JSON
  app.get('/api/exam/docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  console.log('📚 Swagger docs disponible en: http://localhost:3002/api/exam/docs');
};

export default swaggerSpec;
