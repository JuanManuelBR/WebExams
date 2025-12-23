import { Exam } from "@src/models/Exam";
import { Question } from "@src/models/Question";
import { throwHttpError } from "@src/utils/errors";

export class QuestionValidator {
  static crearPreguntasDesdeDto(questionsDto: any[], exam: Exam): Question[] {
    if (!Array.isArray(questionsDto)) {
      throwHttpError("Las preguntas deben ser un arreglo", 400);
    }

    return questionsDto.map((questionDto, index) => {
      if (!questionDto?.type) {
        throwHttpError(`La pregunta en posición ${index} no tiene tipo`, 400);
      }

      const preguntaBase: Partial<Question> = {
        enunciado: questionDto.enunciado,
        type: questionDto.type,
        puntaje: questionDto.puntaje,
        calificacionParcial: questionDto.calificacionParcial,
        exam,
      };

      switch (questionDto.type) {
        case "test":
          return {
            ...preguntaBase,
            shuffleOptions: questionDto.shuffleOptions ?? false,
            options:
              questionDto.options?.map((opt: any, optIndex: number) => {
                if (!opt?.texto || typeof opt.esCorrecta !== "boolean") {
                  throwHttpError(
                    `Opción inválida en pregunta ${index}, opción ${optIndex}`,
                    400
                  );
                }

                return {
                  texto: opt.texto,
                  esCorrecta: opt.esCorrecta,
                };
              }) || [],
          } as Question;
        case "open":
          return {
            ...preguntaBase,

            palabrasClave: questionDto.palabrasClave ?? null,

            textoRespuesta: questionDto.textoRespuesta ?? null,

            debeContenerTodasPalabrasClave:
              questionDto.debeContenerTodasPalabrasClave ?? null,
          } as Question;

        default:
          throwHttpError(
            `Tipo de pregunta no soportado: ${questionDto.type}`,
            400
          );
      }
    });
  }
}
