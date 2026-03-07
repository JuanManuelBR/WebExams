import nodemailer from "nodemailer";
const SMTP_HOST = process.env.SMTP_HOST || "";
const SMTP_PORT = Number(process.env.SMTP_PORT) || 587;
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const SMTP_FROM = process.env.SMTP_FROM || "";

export class EmailService {
  private static getTransporter() {
    return nodemailer.createTransport({
      host: SMTP_HOST || "smtp.gmail.com",
      port: SMTP_PORT || 587,
      secure: (SMTP_PORT || 587) === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });
  }

  static async sendGradeNotification(params: {
    to: string;
    studentName: string;
    examName: string;
    professorName: string;
    nota: number | string;
    codigoRevision: string;
  }): Promise<void> {
    const { to, studentName, examName, professorName, nota, codigoRevision } = params;

    const fromAddress = SMTP_FROM || SMTP_USER;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1a1a2e;">
        <p>Estimado alumn@ <strong>${studentName}</strong>, su nota para el examen <strong>${examName}</strong> del profesor ${professorName} es la siguiente:</p>

        <p style="margin-top: 16px;">
          Nota: <strong>${nota}</strong><br>
          Código de revisión: <strong>${codigoRevision}</strong>
        </p>

        <p style="margin-top: 16px;">
          Por favor ingrese a la página web de APOLO cuyo enlace es el siguiente:
          <a href="https://apolo-tau-roan.vercel.app">https://apolo-tau-roan.vercel.app</a>,
          seleccione estudiantes, luego "Revisar calificación" e ingrese el código de revisión
          para ver la retroalimentación completa de su examen, tenga en cuenta que solo la podrá
          ver <strong>una única vez</strong>, si desea verlo nuevamente tendrá que contactar con su profesor.
        </p>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin-top: 24px;">
        <p style="font-size: 11px; color: #94a3b8; margin-top: 12px;">
          Este es un mensaje automático generado por APOLO, por favor no responda a este correo.
        </p>
      </div>
    `;

    await this.getTransporter().sendMail({
      from: `"APOLO - No responder" <${fromAddress}>`,
      to,
      subject: `Resultado examen: ${examName}`,
      html,
    });
  }
}
