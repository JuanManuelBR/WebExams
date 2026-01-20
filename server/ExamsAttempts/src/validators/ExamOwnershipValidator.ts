import axios from "axios";

export class ExamOwnershipValidator {
  static async validateExamOwnership(
    examId: number,
    profesorId: number
  ): Promise<{ valid: boolean; exam?: any }> {
    try {
      // Usar el endpoint correcto por ID
      const response = await axios.get(
        `http://localhost:3001/api/exams/by-id/${examId}`
      );

      const exam = response.data;
      
      if (exam.id_profesor !== profesorId) {
        console.log(
          `❌ Profesor ${profesorId} NO es dueño del examen ${examId} (dueño: ${exam.id_profesor})`
        );
        return { valid: false };
      }

      console.log(`✅ Profesor ${profesorId} es dueño del examen ${examId}: "${exam.nombre}"`);
      return { valid: true, exam };
    } catch (error: any) {
      console.error("❌ Error validando propiedad del examen:", error.message);
      return { valid: false };
    }
  }
}