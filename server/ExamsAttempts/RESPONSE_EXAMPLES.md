# 📋 Ejemplos de Respuestas de la API

Este documento muestra ejemplos reales de las respuestas de los endpoints de la API.

## 📊 GET `/api/exam/attempt/:intento_id/details`

### Descripción
Obtiene información detallada completa de un intento de examen, incluyendo todas las respuestas del estudiante con sus puntajes, retroalimentación, eventos de seguridad y estadísticas.

### Ejemplo de Respuesta con los 4 Tipos de Preguntas

```json
{
  "intento": {
    "id": 50,
    "examen_id": 20,
    "estado": "finished",
    "nombre_estudiante": "Juan Pérez",
    "correo_estudiante": "juan@example.com",
    "identificacion_estudiante": "123456",
    "fecha_inicio": "2026-02-12T22:24:22.000Z",
    "fecha_fin": "2026-02-12T22:24:32.000Z",
    "limiteTiempoCumplido": "enviar",
    "consecuencia": "ninguna",
    "puntaje": 3.83,
    "puntajeMaximo": 10,
    "porcentaje": 38.33,
    "notaFinal": 1.92,
    "progreso": 100
  },
  "examen": {
    "id": 20,
    "nombre": "Examen de Prueba - Retroalimentación",
    "descripcion": "<p>Examen de prueba para validar la funcionalidad de retroalimentación</p>",
    "codigoExamen": "6UGNQHWo",
    "estado": "open",
    "nombreProfesor": "JUAN MANUEL BLANDON RAMIREZ"
  },
  "estadisticas": {
    "totalPreguntas": 4,
    "preguntasRespondidas": 4,
    "preguntasCorrectas": 1,
    "preguntasIncorrectas": 3,
    "preguntasSinResponder": 0,
    "tiempoTotal": 10
  },
  "preguntas": [
    {
      "id": 41,
      "enunciado": "¿Cuál es la capital de Colombia?",
      "type": "test",
      "puntajeMaximo": 2,
      "calificacionParcial": false,
      "nombreImagen": null,
      "respuestaEstudiante": {
        "id": 65,
        "respuestaParsed": [31],
        "puntajeObtenido": 0,
        "fecha_respuesta": "2026-02-12T22:24:24.000Z",
        "retroalimentacion": null,
        "opcionesSeleccionadas": [
          {
            "id": 31,
            "texto": "Medellín",
            "esCorrecta": false
          }
        ]
      },
      "opciones": [
        {
          "id": 31,
          "texto": "Medellín"
        },
        {
          "id": 32,
          "texto": "Bogotá"
        },
        {
          "id": 33,
          "texto": "Cali"
        },
        {
          "id": 34,
          "texto": "Cartagena"
        }
      ],
      "cantidadRespuestasCorrectas": 1
    },
    {
      "id": 40,
      "enunciado": "Explique brevemente qué es la programación orientada a objetos",
      "type": "open",
      "puntajeMaximo": 3,
      "calificacionParcial": true,
      "nombreImagen": null,
      "respuestaEstudiante": {
        "id": 68,
        "respuestaParsed": "La programación orientada a objetos es un paradigma que organiza el código en objetos que contienen datos y métodos. Se basa en conceptos como clases, herencia, polimorfismo y encapsulamiento.",
        "puntajeObtenido": 3,
        "fecha_respuesta": "2026-02-12T22:24:32.000Z",
        "retroalimentacion": "Perfecto! Demostraste un dominio completo del tema. Mencionaste todos los conceptos clave.",
        "textoEscrito": "La programación orientada a objetos es un paradigma que organiza el código en objetos que contienen datos y métodos. Se basa en conceptos como clases, herencia, polimorfismo y encapsulamiento."
      },
      "textoRespuesta": null,
      "keywords": [
        {
          "id": 1,
          "texto": "clases"
        },
        {
          "id": 2,
          "texto": "objetos"
        },
        {
          "id": 3,
          "texto": "herencia"
        },
        {
          "id": 4,
          "texto": "encapsulamiento"
        }
      ]
    },
    {
      "id": 39,
      "enunciado": "Complete la siguiente frase sobre desarrollo web",
      "type": "fill_blanks",
      "puntajeMaximo": 2.5,
      "calificacionParcial": true,
      "nombreImagen": "c8589a24-0656-4acc-b12d-714938707b3f.webp",
      "respuestaEstudiante": {
        "id": 66,
        "respuestaParsed": [
          "estructura",
          "estilo",
          "comportamiento"
        ],
        "puntajeObtenido": 2.5,
        "fecha_respuesta": "2026-02-12T22:24:28.000Z",
        "retroalimentacion": null,
        "espaciosLlenados": [
          {
            "posicion": 0,
            "respuestaEstudiante": "estructura",
            "respuestaCorrecta": "estructura",
            "esCorrecta": true
          },
          {
            "posicion": 1,
            "respuestaEstudiante": "estilo",
            "respuestaCorrecta": "estilo",
            "esCorrecta": true
          },
          {
            "posicion": 2,
            "respuestaEstudiante": "comportamiento",
            "respuestaCorrecta": "comportamiento",
            "esCorrecta": true
          }
        ]
      },
      "textoCorrecto": "HTML define la ___ de la página, CSS define el ___ y JavaScript define el ___",
      "respuestasCorrectas": [
        {
          "id": 16,
          "posicion": 0,
          "textoCorrecto": "estructura"
        },
        {
          "id": 17,
          "posicion": 1,
          "textoCorrecto": "estilo"
        },
        {
          "id": 18,
          "posicion": 2,
          "textoCorrecto": "comportamiento"
        }
      ]
    },
    {
      "id": 38,
      "enunciado": "Relacione cada lenguaje de programación con su tipo principal",
      "type": "match",
      "puntajeMaximo": 2.5,
      "calificacionParcial": true,
      "nombreImagen": null,
      "respuestaEstudiante": {
        "id": 67,
        "respuestaParsed": [
          {
            "itemA_id": 41,
            "itemB_id": 41
          },
          {
            "itemA_id": 42,
            "itemB_id": 42
          },
          {
            "itemA_id": 43,
            "itemB_id": 43
          }
        ],
        "puntajeObtenido": 2.5,
        "fecha_respuesta": "2026-02-12T22:24:32.000Z",
        "retroalimentacion": null,
        "paresSeleccionados": [
          {
            "itemA": {
              "id": 41,
              "text": "Python"
            },
            "itemB": {
              "id": 41,
              "text": "Interpretado"
            },
            "esCorrecto": true
          },
          {
            "itemA": {
              "id": 42,
              "text": "Java"
            },
            "itemB": {
              "id": 42,
              "text": "Compilado"
            },
            "esCorrecto": true
          },
          {
            "itemA": {
              "id": 43,
              "text": "JavaScript"
            },
            "itemB": {
              "id": 43,
              "text": "Interpretado"
            },
            "esCorrecto": true
          }
        ]
      },
      "paresCorrectos": [
        {
          "id": 41,
          "itemA": {
            "id": 41,
            "text": "Python"
          },
          "itemB": {
            "id": 41,
            "text": "Interpretado"
          }
        },
        {
          "id": 42,
          "itemA": {
            "id": 42,
            "text": "Java"
          },
          "itemB": {
            "id": 42,
            "text": "Compilado"
          }
        },
        {
          "id": 43,
          "itemA": {
            "id": 43,
            "text": "JavaScript"
          },
          "itemB": {
            "id": 43,
            "text": "Interpretado"
          }
        }
      ]
    }
  ],
  "eventos": []
}
```

## 📝 Explicación de la Estructura por Tipo de Pregunta

### 🔘 Pregunta tipo TEST

```json
{
  "id": 41,
  "enunciado": "¿Cuál es la capital de Colombia?",
  "type": "test",
  "puntajeMaximo": 2,
  "calificacionParcial": false,
  "nombreImagen": null,
  "respuestaEstudiante": {
    "id": 65,
    "respuestaParsed": [31],  // Array de IDs de opciones seleccionadas
    "puntajeObtenido": 0,
    "fecha_respuesta": "2026-02-12T22:24:24.000Z",
    "retroalimentacion": null,
    "opcionesSeleccionadas": [  // Detalles de las opciones seleccionadas
      {
        "id": 31,
        "texto": "Medellín",
        "esCorrecta": false  // Indica si esta opción es correcta
      }
    ]
  },
  "opciones": [  // Todas las opciones de la pregunta
    { "id": 31, "texto": "Medellín" },
    { "id": 32, "texto": "Bogotá" },
    { "id": 33, "texto": "Cali" },
    { "id": 34, "texto": "Cartagena" }
  ],
  "cantidadRespuestasCorrectas": 1
}
```

**Campos específicos de TEST:**
- `respuestaParsed`: Array de números (IDs de opciones)
- `opcionesSeleccionadas`: Array con las opciones que el estudiante marcó, incluyendo si son correctas
- `opciones`: Lista de todas las opciones disponibles
- `cantidadRespuestasCorrectas`: Número de opciones correctas que tiene la pregunta

---

### 📝 Pregunta tipo OPEN (Respuesta Abierta)

```json
{
  "id": 40,
  "enunciado": "Explique brevemente qué es la programación orientada a objetos",
  "type": "open",
  "puntajeMaximo": 3,
  "calificacionParcial": true,
  "nombreImagen": null,
  "respuestaEstudiante": {
    "id": 68,
    "respuestaParsed": "La POO es un paradigma...",  // String con la respuesta
    "puntajeObtenido": 3,
    "fecha_respuesta": "2026-02-12T22:24:32.000Z",
    "retroalimentacion": "Excelente explicación",
    "textoEscrito": "La POO es un paradigma..."  // Mismo texto que respuestaParsed
  },
  "textoRespuesta": null,  // Respuesta exacta esperada (si aplica)
  "keywords": [  // Palabras clave para calificación automática
    { "id": 1, "texto": "clases" },
    { "id": 2, "texto": "objetos" },
    { "id": 3, "texto": "herencia" },
    { "id": 4, "texto": "encapsulamiento" }
  ]
}
```

**Campos específicos de OPEN:**
- `respuestaParsed`: String con la respuesta del estudiante
- `textoEscrito`: Copia del texto de la respuesta (para conveniencia)
- `textoRespuesta`: Respuesta exacta esperada (opcional, para preguntas con respuesta única)
- `keywords`: Array de palabras clave para calificación automática parcial

---

### ⬜ Pregunta tipo FILL_BLANKS (Completar Espacios)

```json
{
  "id": 39,
  "enunciado": "Complete la siguiente frase sobre desarrollo web",
  "type": "fill_blanks",
  "puntajeMaximo": 2.5,
  "calificacionParcial": true,
  "nombreImagen": "imagen.webp",
  "respuestaEstudiante": {
    "id": 66,
    "respuestaParsed": ["estructura", "estilo", "comportamiento"],  // Array de strings
    "puntajeObtenido": 2.5,
    "fecha_respuesta": "2026-02-12T22:24:28.000Z",
    "retroalimentacion": null,
    "espaciosLlenados": [  // Detalles de cada espacio
      {
        "posicion": 0,
        "respuestaEstudiante": "estructura",
        "respuestaCorrecta": "estructura",
        "esCorrecta": true
      },
      {
        "posicion": 1,
        "respuestaEstudiante": "estilo",
        "respuestaCorrecta": "estilo",
        "esCorrecta": true
      },
      {
        "posicion": 2,
        "respuestaEstudiante": "comportamiento",
        "respuestaCorrecta": "comportamiento",
        "esCorrecta": true
      }
    ]
  },
  "textoCorrecto": "HTML define la ___ de la página, CSS define el ___ y JavaScript define el ___",
  "respuestasCorrectas": [
    { "id": 16, "posicion": 0, "textoCorrecto": "estructura" },
    { "id": 17, "posicion": 1, "textoCorrecto": "estilo" },
    { "id": 18, "posicion": 2, "textoCorrecto": "comportamiento" }
  ]
}
```

**Campos específicos de FILL_BLANKS:**
- `respuestaParsed`: Array de strings (respuestas en cada espacio)
- `espaciosLlenados`: Array con cada espacio, mostrando la respuesta del estudiante vs la correcta
- `textoCorrecto`: Texto completo con los espacios marcados con `___`
- `respuestasCorrectas`: Array con las respuestas correctas para cada posición

---

### 🔗 Pregunta tipo MATCH (Emparejamiento)

```json
{
  "id": 38,
  "enunciado": "Relacione cada lenguaje de programación con su tipo principal",
  "type": "match",
  "puntajeMaximo": 2.5,
  "calificacionParcial": true,
  "nombreImagen": null,
  "respuestaEstudiante": {
    "id": 67,
    "respuestaParsed": [  // Array de objetos con pares
      { "itemA_id": 41, "itemB_id": 41 },
      { "itemA_id": 42, "itemB_id": 42 },
      { "itemA_id": 43, "itemB_id": 43 }
    ],
    "puntajeObtenido": 2.5,
    "fecha_respuesta": "2026-02-12T22:24:32.000Z",
    "retroalimentacion": null,
    "paresSeleccionados": [  // Detalles de cada par con textos
      {
        "itemA": { "id": 41, "text": "Python" },
        "itemB": { "id": 41, "text": "Interpretado" },
        "esCorrecto": true
      },
      {
        "itemA": { "id": 42, "text": "Java" },
        "itemB": { "id": 42, "text": "Compilado" },
        "esCorrecto": true
      },
      {
        "itemA": { "id": 43, "text": "JavaScript" },
        "itemB": { "id": 43, "text": "Interpretado" },
        "esCorrecto": true
      }
    ]
  },
  "paresCorrectos": [  // Pares correctos de la pregunta
    {
      "id": 41,
      "itemA": { "id": 41, "text": "Python" },
      "itemB": { "id": 41, "text": "Interpretado" }
    },
    {
      "id": 42,
      "itemA": { "id": 42, "text": "Java" },
      "itemB": { "id": 42, "text": "Compilado" }
    },
    {
      "id": 43,
      "itemA": { "id": 43, "text": "JavaScript" },
      "itemB": { "id": 43, "text": "Interpretado" }
    }
  ]
}
```

**Campos específicos de MATCH:**
- `respuestaParsed`: Array de objetos `{itemA_id, itemB_id}`
- `paresSeleccionados`: Array con los pares seleccionados por el estudiante, incluyendo textos y si es correcto
- `paresCorrectos`: Array con los pares correctos de la pregunta

---

## 🎯 Uso de la Retroalimentación

La retroalimentación se puede agregar a cualquier tipo de pregunta usando el endpoint:

```
PATCH /api/exam/answer/:respuesta_id/manual-grade
```

**Body:**
```json
{
  "puntaje": 2.5,
  "retroalimentacion": "Muy buena respuesta, pero podrías mejorar la explicación del segundo punto."
}
```

La retroalimentación aparecerá en el campo `respuestaEstudiante.retroalimentacion` de cada pregunta.
