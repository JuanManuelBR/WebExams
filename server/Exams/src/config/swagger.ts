import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Exams API',
      version: '1.0.0',
      description: 'API para gestionar exámenes, imágenes y archivos PDF',
      contact: {
        name: 'WebExams Team',
      },
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Servidor de desarrollo',
      },
    ],
    tags: [
      {
        name: 'Exams',
        description: 'Gestión de exámenes',
      },
      {
        name: 'Images',
        description: 'Gestión de imágenes (almacenamiento local)',
      },
      {
        name: 'PDFs',
        description: 'Gestión de archivos PDF',
      },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'token',
          description: 'JWT de autenticación enviado en cookie HttpOnly',
        },
      },
      schemas: {
        Exam: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 19 },
            nombre: { type: 'string', example: 'Examen de Programación' },
            codigoExamen: { type: 'string', example: 'ABC123XY' },
            descripcion: { type: 'string', example: '<p>Descripción del examen</p>' },
            nombreProfesor: { type: 'string', example: 'Dr. García' },
            limiteTiempo: { type: 'number', example: 90, description: 'Minutos' },
            consecuencia: {
              type: 'string',
              enum: ['bloquear', 'registrar', 'ninguna'],
              example: 'bloquear',
            },
            estado: {
              type: 'string',
              enum: ['draft', 'open', 'closed', 'archived'],
              example: 'open',
            },
            contrasena: { type: 'string', nullable: true, example: 'pass123' },
            archivoPDF: { type: 'string', nullable: true, example: 'examen.pdf' },
            incluirCalculadoraCientifica: { type: 'boolean', example: true },
            incluirHerramientaDibujo: { type: 'boolean', example: false },
            incluirHojaExcel: { type: 'boolean', example: false },
            incluirJavascript: { type: 'boolean', example: false },
            incluirPython: { type: 'boolean', example: false },
            dividirPreguntas: { type: 'boolean', example: false },
            permitirVolverPreguntas: { type: 'boolean', example: true },
            questions: {
              type: 'array',
              description: 'Preguntas del examen',
              items: { type: 'object' },
            },
            createdAt: { type: 'string', format: 'date-time', example: '2026-01-15T10:00:00.000Z' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Examen no encontrado' },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.ts'],
};

const swaggerSpec = swaggerJsdoc(options);

const HIDE_TOPBAR_CSS = '.swagger-ui .topbar { display: none }';
// En la vista unificada solo ocultamos el logo pero dejamos visible el selector de API
const UNIFIED_CSS = '.swagger-ui .topbar-wrapper img, .swagger-ui .topbar-wrapper a span { display: none } .swagger-ui .topbar { background-color: #1b1b1b }';

export const setupSwagger = (app: Express): void => {
  // Docs individuales por servicio
  app.use('/api/exams/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'Exams API Docs',
    customCss: HIDE_TOPBAR_CSS,
  }));

  app.get('/api/exams/docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  // Proxy de specs de los otros servicios (evita CORS en el navegador)
  app.get('/api/docs/specs/users.json', async (_req, res) => {
    try {
      const r = await fetch('http://localhost:3000/api/users/docs.json');
      res.setHeader('Content-Type', 'application/json');
      res.send(await r.json());
    } catch {
      res.status(503).json({ message: 'Users API no disponible' });
    }
  });

  app.get('/api/docs/specs/attempts.json', async (_req, res) => {
    try {
      const r = await fetch('http://localhost:3002/api/exam/docs.json');
      res.setHeader('Content-Type', 'application/json');
      res.send(await r.json());
    } catch {
      res.status(503).json({ message: 'ExamsAttempts API no disponible' });
    }
  });

  // Índice unificado de documentación
  app.get('/api/docs', (_req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>WebExams API Docs</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #1b1b1b; color: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .container { max-width: 480px; width: 100%; padding: 40px 24px; }
    .logo { font-size: 13px; color: #555; margin-bottom: 24px; letter-spacing: 1px; text-transform: uppercase; }
    h1 { font-size: 26px; font-weight: 700; margin-bottom: 6px; }
    .subtitle { color: #888; font-size: 14px; margin-bottom: 36px; }
    .card { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px; background: #252525; border-radius: 12px; margin-bottom: 10px; text-decoration: none; color: #fff; border: 1px solid #333; transition: border-color .15s, background .15s; }
    .card:hover { background: #2e2e2e; border-color: #555; }
    .card-left { display: flex; align-items: center; gap: 14px; }
    .port { font-size: 11px; font-weight: 700; padding: 4px 9px; border-radius: 99px; min-width: 42px; text-align: center; }
    .p3001 { background: #0f2744; color: #61affe; }
    .p3000 { background: #0f2e1e; color: #49cc90; }
    .p3002 { background: #2e2000; color: #fca130; }
    .name { font-weight: 600; font-size: 15px; }
    .desc { font-size: 12px; color: #777; margin-top: 3px; }
    .arrow { color: #444; font-size: 16px; }
    .card:hover .arrow { color: #888; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">WebExams</div>
    <h1>API Documentation</h1>
    <p class="subtitle">Selecciona un servicio para ver su documentación interactiva.</p>

    <a class="card" href="/api/exams/docs" target="_blank">
      <div class="card-left">
        <span class="port p3001">3001</span>
        <div>
          <div class="name">Exams API</div>
          <div class="desc">Exámenes · Imágenes · PDFs &mdash; 15 endpoints</div>
        </div>
      </div>
      <span class="arrow">&#8594;</span>
    </a>

    <a class="card" href="http://localhost:3000/api/users/docs" target="_blank">
      <div class="card-left">
        <span class="port p3000">3000</span>
        <div>
          <div class="name">Users API</div>
          <div class="desc">Usuarios · Autenticación &mdash; 14 endpoints</div>
        </div>
      </div>
      <span class="arrow">&#8594;</span>
    </a>

    <a class="card" href="http://localhost:3002/api/exam/docs" target="_blank">
      <div class="card-left">
        <span class="port p3002">3002</span>
        <div>
          <div class="name">ExamsAttempts API</div>
          <div class="desc">Intentos · Calificaciones · Eventos &mdash; 24 endpoints</div>
        </div>
      </div>
      <span class="arrow">&#8594;</span>
    </a>
  </div>
</body>
</html>`);
  });

  console.log('📚 API Docs: http://localhost:3001/api/docs');
};

export default swaggerSpec;
