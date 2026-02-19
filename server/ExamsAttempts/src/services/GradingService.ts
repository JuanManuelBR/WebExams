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
    console.log("\n" + "=".repeat(60));
    console.log(`🔍 CALIFICANDO PREGUNTA TEST - ID: ${question.id}`);
    console.log("=".repeat(60));

    // Si no hay respuesta, puntaje = 0
    if (!studentAnswer || !studentAnswer.respuesta) {
      console.log("❌ No hay respuesta del estudiante");
      console.log(`📊 Puntaje obtenido: 0.00000/${question.puntaje}`);
      return 0;
    }

    try {
      // 1. Parsear la respuesta del estudiante
      const selectedIds: number[] = JSON.parse(studentAnswer.respuesta);
      console.log(`📝 Respuesta del estudiante: [${selectedIds.join(", ")}]`);

      // 2. Obtener los IDs de las opciones correctas
      const correctIds = question.options
        .filter((opt) => opt.esCorrecta)
        .map((opt) => opt.id);

      console.log(`✅ Respuestas correctas: [${correctIds.join(", ")}]`);

      // Mostrar todas las opciones
      console.log("\n📋 Opciones disponibles:");
      question.options.forEach((opt) => {
        const mark = opt.esCorrecta ? "✅" : "❌";
        const selected = selectedIds.includes(opt.id) ? "👉" : "  ";
        console.log(`  ${selected} ${mark} [${opt.id}] ${opt.texto}`);
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
      console.log(
        `\n🎯 ¿Respuesta exactamente correcta? ${isExactlyCorrect ? "SÍ ✅" : "NO ❌"}`,
      );

      // 5. Contar respuestas correctas e incorrectas seleccionadas
      const correctlySelected = selectedIds.filter((id) =>
        correctIds.includes(id),
      );
      const incorrectlySelected = selectedIds.filter(
        (id) => !correctIds.includes(id),
      );

      console.log(`\n📊 Análisis de la respuesta:`);
      console.log(
        `   • Correctas seleccionadas: ${correctlySelected.length}/${correctIds.length}`,
      );
      console.log(
        `   • Incorrectas seleccionadas: ${incorrectlySelected.length}`,
      );
      console.log(
        `   • Calificación parcial: ${question.calificacionParcial ? "SÍ" : "NO"}`,
      );

      // 6. Aplicar lógica según calificacionParcial
      let puntajeObtenido = 0;

      if (question.calificacionParcial) {
        console.log("\n🔹 MODO: Calificación parcial activada");
        console.log(
          "   📌 Se califica proporcionalmente por correctas marcadas",
        );
        console.log("   📌 NO se penaliza por marcar incorrectas");

        // Calcular puntaje proporcional basado en correctas seleccionadas
        const proportion = correctlySelected.length / correctIds.length;
        puntajeObtenido = question.puntaje * proportion;

        console.log(
          `   ✅ Proporción: ${correctlySelected.length}/${correctIds.length} = ${(proportion * 100).toFixed(2)}%`,
        );
        console.log(
          `   📐 Cálculo: ${question.puntaje} × ${proportion.toFixed(5)} = ${puntajeObtenido.toFixed(5)}`,
        );

        if (incorrectlySelected.length > 0) {
          console.log(
            `   ℹ️  Marcó ${incorrectlySelected.length} incorrecta(s) pero NO afecta el puntaje`,
          );
        }
      } else {
        console.log("\n🔹 MODO: Todo o nada (sin calificación parcial)");
        console.log(
          "   📌 Debe marcar SOLO las correctas y NINGUNA incorrecta",
        );

        puntajeObtenido = isExactlyCorrect ? question.puntaje : 0;

        if (isExactlyCorrect) {
          console.log(`   ✅ Respuesta perfecta`);
        } else {
          if (incorrectlySelected.length > 0) {
            console.log(
              `   ❌ Marcó ${incorrectlySelected.length} incorrecta(s)`,
            );
          }
          if (correctlySelected.length < correctIds.length) {
            console.log(
              `   ❌ Faltó marcar ${correctIds.length - correctlySelected.length} correcta(s)`,
            );
          }
        }
      }

      console.log(
        `\n🎯 RESULTADO FINAL: ${puntajeObtenido.toFixed(5)}/${question.puntaje}`,
      );
      console.log("=".repeat(60) + "\n");

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
    console.log("\n" + "=".repeat(60));
    console.log(`🔍 CALIFICANDO PREGUNTA OPEN - ID: ${question.id}`);
    console.log("=".repeat(60));

    // Si no hay respuesta del estudiante, puntaje = 0
    if (
      !studentAnswer ||
      !studentAnswer.respuesta ||
      !studentAnswer.respuesta.trim()
    ) {
      console.log("❌ No hay respuesta del estudiante");
      console.log(`📊 Puntaje obtenido: 0.00000/${question.puntaje}`);
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
      console.log(`🔧 Comillas extras detectadas y removidas`);
    }

    // Si viene como JSON string ("texto"), parsear
    if (
      respuestaEstudiante.startsWith('"') &&
      respuestaEstudiante.endsWith('"')
    ) {
      try {
        respuestaEstudiante = JSON.parse(respuestaEstudiante);
        console.log(`🔧 Respuesta parseada desde JSON`);
      } catch (e) {
        // Si falla el parse, usar el texto tal cual (sin comillas)
        respuestaEstudiante = respuestaEstudiante.slice(1, -1);
        console.log(`🔧 Comillas simples removidas manualmente`);
      }
    }

    console.log(
      `📝 Respuesta del estudiante (limpia): "${respuestaEstudiante}"`,
    );

    // CASO 1: Texto exacto (textoRespuesta definido)
    if (question.textoRespuesta) {
      console.log("\n🔹 MODO: Texto exacto (coincidencia 100%)");
      console.log(`✅ Texto correcto esperado: "${question.textoRespuesta}"`);

      const esExacto = respuestaEstudiante === question.textoRespuesta;

      if (esExacto) {
        console.log(`   ✅ Coincidencia exacta`);
        console.log(
          `\n🎯 RESULTADO FINAL: ${question.puntaje.toFixed(5)}/${question.puntaje}`,
        );
        console.log("=".repeat(60) + "\n");
        return question.puntaje;
      } else {
        console.log(`   ❌ No coincide exactamente`);
        console.log(`   📊 Comparación:`);
        console.log(`      Esperado: "${question.textoRespuesta}"`);
        console.log(`      Recibido: "${respuestaEstudiante}"`);
        console.log(
          `      Longitud esperada: ${question.textoRespuesta.length}`,
        );
        console.log(`      Longitud recibida: ${respuestaEstudiante.length}`);
        console.log(`\n🎯 RESULTADO FINAL: 0.00000/${question.puntaje}`);
        console.log("=".repeat(60) + "\n");
        return 0;
      }
    }

    // CASO 2: Keywords (calificación parcial)
    if (question.keywords && question.keywords.length > 0) {
      console.log("\n🔹 MODO: Keywords (calificación parcial)");
      console.log(`📋 Total keywords: ${question.keywords.length}`);

      // Normalizar respuesta del estudiante (lowercase para comparación)
      const respuestaNormalizada = this.normalizeText(respuestaEstudiante);
      console.log(`📝 Respuesta normalizada: "${respuestaNormalizada}"`);

      // Buscar keywords en la respuesta COMO PALABRAS COMPLETAS
      let keywordsEncontradas = 0;

      console.log(
        "\n🔍 Buscando keywords (palabras completas) en la respuesta:",
      );
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
          console.log(
            `   ✅ [${index + 1}] "${keyword.texto}" → ENCONTRADA (palabra completa)`,
          );
        } else {
          console.log(
            `   ❌ [${index + 1}] "${keyword.texto}" → NO encontrada`,
          );
        }
      });

      console.log(`\n📊 Análisis:`);
      console.log(
        `   • Keywords encontradas: ${keywordsEncontradas}/${question.keywords.length}`,
      );

      // Calcular puntaje proporcional
      const proporcion = keywordsEncontradas / question.keywords.length;
      const puntajeObtenido = question.puntaje * proporcion;

      console.log(`   • Proporción: ${(proporcion * 100).toFixed(2)}%`);
      console.log(
        `   📐 Cálculo: ${question.puntaje} × ${proporcion.toFixed(5)} = ${puntajeObtenido.toFixed(5)}`,
      );

      console.log(
        `\n🎯 RESULTADO FINAL: ${puntajeObtenido.toFixed(5)}/${question.puntaje}`,
      );
      console.log("=".repeat(60) + "\n");

      return puntajeObtenido;
    }

    // CASO 3: Calificación manual (sin textoRespuesta ni keywords)
    console.log("\n🔹 MODO: Calificación manual");
    console.log("   ⚠️  Esta pregunta no tiene respuesta correcta definida");
    console.log("   ⚠️  Debe ser calificada manualmente por el profesor");
    console.log("   📝 Respuesta del estudiante guardada para revisión");
    console.log(
      `\n🎯 RESULTADO FINAL: 0.00000/${question.puntaje} (Pendiente revisión manual)`,
    );
    console.log("=".repeat(60) + "\n");

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
    console.log("\n" + "=".repeat(60));
    console.log(`🔍 CALIFICANDO PREGUNTA FILL_BLANKS - ID: ${question.id}`);
    console.log("=".repeat(60));

    // Si no hay respuesta del estudiante, puntaje = 0
    if (!studentAnswer || !studentAnswer.respuesta) {
      console.log("❌ No hay respuesta del estudiante");
      console.log(`📊 Puntaje obtenido: 0.00000/${question.puntaje}`);
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

      console.log(`📝 Texto base: "${question.textoCorrecto}"`);
      console.log(
        `📋 Total de espacios en blanco: ${question.respuestas.length}`,
      );
      console.log(
        `📥 Respuestas del estudiante: [${respuestasEstudiante.map((r) => `"${r}"`).join(", ")}]`,
      );

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

      console.log("\n🔍 Comparando cada espacio en blanco:");

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
          console.log(
            `   ✅ [${index + 1}] Posición ${respuestaCorrecta.posicion}: ` +
              `"${respuestaEstudiante}" = "${respuestaCorrecta.textoCorrecto}" ✓`,
          );
        } else {
          console.log(
            `   ❌ [${index + 1}] Posición ${respuestaCorrecta.posicion}: ` +
              `"${respuestaEstudiante}" ≠ "${respuestaCorrecta.textoCorrecto}"`,
          );
          console.log(
            `      Normalizado: "${estudianteNormalizado}" vs "${correctoNormalizado}"`,
          );
        }
      });

      console.log(`\n📊 Análisis:`);
      console.log(
        `   • Respuestas correctas: ${respuestasCorrectas}/${question.respuestas.length}`,
      );
      console.log(
        `   • Calificación parcial: ${question.calificacionParcial ? "SÍ" : "NO"}`,
      );

      // 5. Calcular puntaje según calificacionParcial
      let puntajeObtenido = 0;

      if (question.calificacionParcial) {
        console.log("\n🔹 MODO: Calificación parcial activada");

        // Calcular puntaje proporcional
        const proporcion = respuestasCorrectas / question.respuestas.length;
        puntajeObtenido = question.puntaje * proporcion;

        console.log(
          `   ✅ Proporción: ${respuestasCorrectas}/${question.respuestas.length} = ${(proporcion * 100).toFixed(2)}%`,
        );
        console.log(
          `   📐 Cálculo: ${question.puntaje} × ${proporcion.toFixed(5)} = ${puntajeObtenido.toFixed(5)}`,
        );
      } else {
        console.log("\n🔹 MODO: Todo o nada (sin calificación parcial)");

        // Debe tener TODAS correctas
        const todasCorrectas =
          respuestasCorrectas === question.respuestas.length;
        puntajeObtenido = todasCorrectas ? question.puntaje : 0;

        if (todasCorrectas) {
          console.log(`   ✅ Todas las respuestas correctas`);
        } else {
          console.log(
            `   ❌ Al menos una respuesta incorrecta (${question.respuestas.length - respuestasCorrectas} errores)`,
          );
        }
      }

      console.log(
        `\n🎯 RESULTADO FINAL: ${puntajeObtenido.toFixed(5)}/${question.puntaje}`,
      );
      console.log("=".repeat(60) + "\n");

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
    console.log("\n" + "=".repeat(60));
    console.log(`🔍 CALIFICANDO PREGUNTA MATCH - ID: ${question.id}`);
    console.log("=".repeat(60));

    // Si no hay respuesta del estudiante, puntaje = 0
    if (!studentAnswer || !studentAnswer.respuesta) {
      console.log("❌ No hay respuesta del estudiante");
      console.log(`📊 Puntaje obtenido: 0.00000/${question.puntaje}`);
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

      console.log(`📋 Total de pares correctos: ${question.pares.length}`);
      console.log(
        `📥 Total de pares del estudiante: ${paresEstudiante.length}`,
      );

      // 2. Mostrar pares correctos
      console.log("\n✅ Pares correctos:");
      question.pares.forEach((par, index) => {
        console.log(
          `   [${index + 1}] itemA(${par.itemA.id}): "${par.itemA.text}" ↔ ` +
            `itemB(${par.itemB.id}): "${par.itemB.text}"`,
        );
      });

      // 3. Crear un Set de pares correctos para búsqueda rápida
      const paresCorrectosSet = new Set<string>();
      question.pares.forEach((par) => {
        // Crear una clave única con itemA_id e itemB_id
        paresCorrectosSet.add(`${par.itemA.id}-${par.itemB.id}`);
      });

      // 4. Validar cada par del estudiante
      let paresCorrectos = 0;

      console.log("\n🔍 Validando pares del estudiante:");

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
          console.log(
            `   ✅ [${index + 1}] itemA(${parEstudiante.itemA_id}): "${parCorrecto.itemA.text}" ↔ ` +
              `itemB(${parEstudiante.itemB_id}): "${parCorrecto.itemB.text}" ✓`,
          );
        } else {
          // Buscar información de los items para mostrar mejor el error
          const itemA = question.pares.find(
            (p) => p.itemA.id === parEstudiante.itemA_id,
          );
          const itemB = question.pares.find(
            (p) => p.itemB.id === parEstudiante.itemB_id,
          );

          console.log(
            `   ❌ [${index + 1}] itemA(${parEstudiante.itemA_id})${itemA ? `: "${itemA.itemA.text}"` : ""} ↔ ` +
              `itemB(${parEstudiante.itemB_id})${itemB ? `: "${itemB.itemB.text}"` : ""} ✗`,
          );
          console.log(`      Emparejamiento incorrecto`);
        }
      });

      console.log(`\n📊 Análisis:`);
      console.log(
        `   • Pares correctos: ${paresCorrectos}/${question.pares.length}`,
      );
      console.log(`   • Pares intentados: ${paresEstudiante.length}`);
      console.log(
        `   • Calificación parcial: ${question.calificacionParcial ? "SÍ" : "NO"}`,
      );

      // 5. Calcular puntaje según calificacionParcial
      let puntajeObtenido = 0;

      if (question.calificacionParcial) {
        console.log("\n🔹 MODO: Calificación parcial activada");

        // Calcular puntaje proporcional
        const proporcion = paresCorrectos / question.pares.length;
        puntajeObtenido = question.puntaje * proporcion;

        console.log(
          `   ✅ Proporción: ${paresCorrectos}/${question.pares.length} = ${(proporcion * 100).toFixed(2)}%`,
        );
        console.log(
          `   📐 Cálculo: ${question.puntaje} × ${proporcion.toFixed(5)} = ${puntajeObtenido.toFixed(5)}`,
        );
      } else {
        console.log("\n🔹 MODO: Todo o nada (sin calificación parcial)");

        // Debe tener TODOS correctos
        const todosCorrectos = paresCorrectos === question.pares.length;
        puntajeObtenido = todosCorrectos ? question.puntaje : 0;

        if (todosCorrectos) {
          console.log(`   ✅ Todos los pares correctos`);
        } else {
          console.log(
            `   ❌ Al menos un par incorrecto (${question.pares.length - paresCorrectos} errores)`,
          );
        }
      }

      console.log(
        `\n🎯 RESULTADO FINAL: ${puntajeObtenido.toFixed(5)}/${question.puntaje}`,
      );
      console.log("=".repeat(60) + "\n");

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
