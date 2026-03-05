// ============================================
// src/services/GradingService.ts
// Servicio de calificación automática
// ============================================

import {
  FillBlanksQuestion,
  MatchQuestion,
  OpenQuestion,
  StudentAnswer,
  TestQuestion,
} from "../interfaces/TestInterfaces";

export class GradingService {
  /**
   * Califica una pregunta tipo TEST
   */
  static gradeTestQuestion(
    question: TestQuestion,
    studentAnswer: StudentAnswer | undefined,
  ): number {
    // Si no hay respuesta, puntaje = 0
    if (!studentAnswer || !studentAnswer.respuesta) {
      return 0;
    }

    try {
      // 1. Parsear la respuesta del estudiante
      const selectedIds: number[] = JSON.parse(studentAnswer.respuesta);

      // 2. Obtener los IDs de las opciones correctas
      const correctIds = question.options
        .filter((opt) => opt.esCorrecta)
        .map((opt) => opt.id);

      // Mostrar todas las opciones
      question.options.forEach((opt) => {
        const mark = opt.esCorrecta ? "✅" : "❌";
        const selected = selectedIds.includes(opt.id) ? "👉" : "  ";
      });

      // 3. Si no hay respuestas correctas definidas, error
      if (correctIds.length === 0) {
        console.warn(
          `⚠️ Pregunta ${question.id} no tiene opciones correctas definidas`,
        );
        return 0;
      }

      // 4. Verificar si la respuesta es exactamente correcta
      const isExactlyCorrect = this.areArraysEqual(selectedIds, correctIds);

      // 5. Contar respuestas correctas e incorrectas seleccionadas
      const correctlySelected = selectedIds.filter((id) =>
        correctIds.includes(id),
      );
      const incorrectlySelected = selectedIds.filter(
        (id) => !correctIds.includes(id),
      );

      // 6. Aplicar lógica según calificacionParcial
      let puntajeObtenido = 0;

      const selectedCount = selectedIds.length;
      const totalOptions = question.options.length;
      const totalIncorrect = totalOptions - correctIds.length;

      if (question.calificacionParcial) {
        if (selectedCount <= correctIds.length) {
          // Caso A: el estudiante marcó igual o menos opciones de las que hay correctas.
          // Se da crédito proporcional por las correctas identificadas,
          // sin penalizar por incorrectas marcadas (ej: A,C da igual que solo A).

          const proportion = correctlySelected.length / correctIds.length;
          puntajeObtenido = question.puntaje * proportion;
        } else {
          // Caso B: el estudiante marcó MÁS opciones de las que hay correctas → penalización.
          // Penalización doble: right-minus-wrong + factor de exceso.
          // Marcar TODAS siempre da 0 (excessRatio alcanza 1).

          // Correctas netas: cada incorrecta cancela una correcta
          const effectiveCorrect = Math.max(
            0,
            correctlySelected.length - incorrectlySelected.length,
          );

          // Ratio de exceso: qué fracción de las opciones incorrectas disponibles se marcaron
          const excess = selectedCount - correctIds.length;
          const excessRatio = totalIncorrect > 0 ? excess / totalIncorrect : 1;

          puntajeObtenido =
            (effectiveCorrect / correctIds.length) *
            (1 - excessRatio) *
            question.puntaje;

          if (selectedCount === totalOptions) {
            console.log(`   🚫 Marcó TODAS las opciones → puntaje = 0`);
          }
        }
      } else {
        puntajeObtenido = isExactlyCorrect ? question.puntaje : 0;
      }

      return puntajeObtenido;
    } catch (error) {
      console.error(
        `❌ Error al calificar pregunta TEST ${question.id}:`,
        error,
      );
      return 0;
    }
  }
  /**
   * Califica una pregunta tipo OPEN (respuesta abierta)
   */
  static gradeOpenQuestion(
    question: OpenQuestion,
    studentAnswer: StudentAnswer | undefined,
  ): number {
    // Si no hay respuesta del estudiante, puntaje = 0
    if (
      !studentAnswer ||
      !studentAnswer.respuesta ||
      !studentAnswer.respuesta.trim()
    ) {
      return 0;
    }

    // ✅ LIMPIAR COMILLAS DOBLES EXTRAS
    let respuestaEstudiante = studentAnswer.respuesta.trim();

    // Si viene con comillas dobles extras (""texto""), quitarlas
    if (
      respuestaEstudiante.startsWith('""') &&
      respuestaEstudiante.endsWith('""')
    ) {
      respuestaEstudiante = respuestaEstudiante.slice(2, -2);
    }

    // Si viene como JSON string ("texto"), parsear
    if (
      respuestaEstudiante.startsWith('"') &&
      respuestaEstudiante.endsWith('"')
    ) {
      try {
        respuestaEstudiante = JSON.parse(respuestaEstudiante);
      } catch (e) {
        // Si falla el parse, usar el texto tal cual (sin comillas)
        respuestaEstudiante = respuestaEstudiante.slice(1, -1);
      }
    }

    // CASO 1: Texto exacto (textoRespuesta definido)
    if (question.textoRespuesta) {
      const esExacto = respuestaEstudiante === question.textoRespuesta;

      if (esExacto) {
        return question.puntaje;
      } else {
        return 0;
      }
    }

    // CASO 2: Keywords (calificación parcial)
    if (question.keywords && question.keywords.length > 0) {
      // Normalizar respuesta del estudiante (lowercase para comparación)
      const respuestaNormalizada = this.normalizeText(respuestaEstudiante);

      // Buscar keywords en la respuesta COMO PALABRAS COMPLETAS
      let keywordsEncontradas = 0;

      question.keywords.forEach((keyword, index) => {
        const keywordNormalizada = this.normalizeText(keyword.texto);

        // ✅ Usar regex con word boundaries para buscar palabra completa
        // \b = word boundary (límite de palabra)
        const regex = new RegExp(
          `\\b${this.escapeRegex(keywordNormalizada)}\\b`,
          "i",
        );
        const encontrada = regex.test(respuestaNormalizada);

        if (encontrada) {
          keywordsEncontradas++;
        } else {
          console.log(
            `   ❌ [${index + 1}] "${keyword.texto}" → NO encontrada`,
          );
        }
      });

      // Calcular puntaje proporcional
      const proporcion = keywordsEncontradas / question.keywords.length;
      const puntajeObtenido = question.puntaje * proporcion;

      return puntajeObtenido;
    }

    return 0;
  }

  /**
   * Normaliza texto para comparación (lowercase, sin acentos, sin espacios extra)
   */
  private static normalizeText(text: string): string {
    return text
      .toLowerCase()
      .normalize("NFD") // Descomponer caracteres con acentos
      .replace(/[\u0300-\u036f]/g, "") // Eliminar acentos
      .replace(/\s+/g, " ") // Reemplazar múltiples espacios por uno solo
      .trim();
  }

  /**
   * Compara dos arrays de números sin importar el orden
   */
  private static areArraysEqual(arr1: number[], arr2: number[]): boolean {
    if (arr1.length !== arr2.length) return false;

    const sorted1 = [...arr1].sort((a, b) => a - b);
    const sorted2 = [...arr2].sort((a, b) => a - b);

    return sorted1.every((val, index) => val === sorted2[index]);
  }

  /**
   * Escapa caracteres especiales de regex para búsqueda literal
   */
  private static escapeRegex(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  /**
   * Califica una pregunta tipo FILL_BLANKS (completar espacios)
   */
  static gradeFillBlanksQuestion(
    question: FillBlanksQuestion,
    studentAnswer: StudentAnswer | undefined,
  ): number {

    // Si no hay respuesta del estudiante, puntaje = 0
    if (!studentAnswer || !studentAnswer.respuesta) {
      return 0;
    }

    try {
      // 1. Parsear la respuesta del estudiante (viene como JSON array)
      let respuestasEstudiante: string[];

      try {
        respuestasEstudiante = JSON.parse(studentAnswer.respuesta);
      } catch (e) {
        console.error("❌ Error al parsear respuesta del estudiante:", e);
        return 0;
      }

      // 2. Validar que el número de respuestas coincida
      if (respuestasEstudiante.length !== question.respuestas.length) {
        console.warn(
          `⚠️ Número de respuestas no coincide: esperadas ${question.respuestas.length}, recibidas ${respuestasEstudiante.length}`,
        );
        return 0;
      }

      // 3. Ordenar respuestas correctas por posición
      const respuestasOrdenadas = [...question.respuestas].sort(
        (a, b) => a.posicion - b.posicion,
      );

      // 4. Comparar cada respuesta
      let respuestasCorrectas = 0;


      respuestasOrdenadas.forEach((respuestaCorrecta, index) => {
        const respuestaEstudiante = respuestasEstudiante[index] || "";

        // Normalizar ambas respuestas para comparación
        const estudianteNormalizado = this.normalizeText(respuestaEstudiante);
        const correctoNormalizado = this.normalizeText(
          respuestaCorrecta.textoCorrecto,
        );

        const esCorrecta = estudianteNormalizado === correctoNormalizado;

        if (esCorrecta) {
          respuestasCorrectas++;

        } 
      });

      // 5. Calcular puntaje según calificacionParcial
      let puntajeObtenido = 0;

      if (question.calificacionParcial) {

        // Calcular puntaje proporcional
        const proporcion = respuestasCorrectas / question.respuestas.length;
        puntajeObtenido = question.puntaje * proporcion;


      } else {
        // Debe tener TODAS correctas
        const todasCorrectas =
          respuestasCorrectas === question.respuestas.length;
        puntajeObtenido = todasCorrectas ? question.puntaje : 0;

      }

      return puntajeObtenido;
    } catch (error) {
      console.error(
        `❌ Error al calificar pregunta FILL_BLANKS ${question.id}:`,
        error,
      );
      return 0;
    }
  }

  /**
   * Califica una pregunta tipo MATCH (emparejamiento)
   */
  static gradeMatchQuestion(
    question: MatchQuestion,
    studentAnswer: StudentAnswer | undefined,
  ): number {

    // Si no hay respuesta del estudiante, puntaje = 0
    if (!studentAnswer || !studentAnswer.respuesta) {
      return 0;
    }

    try {
      // 1. Parsear la respuesta del estudiante (viene como JSON array)
      let paresEstudiante: Array<{ itemA_id: number; itemB_id: number }>;

      try {
        paresEstudiante = JSON.parse(studentAnswer.respuesta);
      } catch (e) {
        console.error("❌ Error al parsear respuesta del estudiante:", e);
        return 0;
      }

      // 3. Crear un Set de pares correctos para búsqueda rápida
      const paresCorrectosSet = new Set<string>();
      question.pares.forEach((par) => {
        // Crear una clave única con itemA_id e itemB_id
        paresCorrectosSet.add(`${par.itemA.id}-${par.itemB.id}`);
      });

      // 4. Validar cada par del estudiante
      let paresCorrectos = 0;


      paresEstudiante.forEach((parEstudiante, index) => {
        const claveEstudiante = `${parEstudiante.itemA_id}-${parEstudiante.itemB_id}`;
        const esCorrecto = paresCorrectosSet.has(claveEstudiante);

        // Buscar info del par para mostrar en logs
        const parCorrecto = question.pares.find(
          (p) =>
            p.itemA.id === parEstudiante.itemA_id &&
            p.itemB.id === parEstudiante.itemB_id,
        );

        if (esCorrecto && parCorrecto) {
          paresCorrectos++;

        } else {
          // Buscar información de los items para mostrar mejor el error
          const itemA = question.pares.find(
            (p) => p.itemA.id === parEstudiante.itemA_id,
          );
          const itemB = question.pares.find(
            (p) => p.itemB.id === parEstudiante.itemB_id,
          );


        }
      });


      // 5. Calcular puntaje según calificacionParcial
      let puntajeObtenido = 0;

      if (question.calificacionParcial) {

        // Calcular puntaje proporcional
        const proporcion = paresCorrectos / question.pares.length;
        puntajeObtenido = question.puntaje * proporcion;

      
      
      } else {

        // Debe tener TODOS correctos
        const todosCorrectos = paresCorrectos === question.pares.length;
        puntajeObtenido = todosCorrectos ? question.puntaje : 0;
      }

      return puntajeObtenido;
    } catch (error) {
      console.error(
        `❌ Error al calificar pregunta MATCH ${question.id}:`,
        error,
      );
      return 0;
    }
  }

  /**
   * Calcula porcentaje y nota final (escala 0-5)
   */
  static calculateFinalGrade(
    puntajeObtenido: number,
    puntajeMaximo: number,
  ): {
    porcentaje: number;
    notaFinal: number;
  } {
    if (puntajeMaximo === 0) {
      return { porcentaje: 0, notaFinal: 0.0 };
    }

    const porcentaje = (puntajeObtenido / puntajeMaximo) * 100;
    const notaFinal = (porcentaje / 100) * 5;

    return {
      porcentaje: Math.round(porcentaje * 100) / 100, // 2 decimales
      notaFinal: Math.round(notaFinal * 100) / 100, // 2 decimales
    };
  }
}
