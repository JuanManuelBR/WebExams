// ============================================
// src/services/GradingService.ts
// Servicio de calificación automática
// ============================================

import { StudentAnswer, TestQuestion } from "@src/interfaces/TestInterfaces.ts";

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
   * Compara dos arrays de números sin importar el orden
   */
  private static areArraysEqual(arr1: number[], arr2: number[]): boolean {
    if (arr1.length !== arr2.length) return false;

    const sorted1 = [...arr1].sort((a, b) => a - b);
    const sorted2 = [...arr2].sort((a, b) => a - b);

    return sorted1.every((val, index) => val === sorted2[index]);
  }
}
