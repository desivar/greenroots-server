import nodemailer from 'nodemailer';

const transport = nodemailer.createTransport({
  host:   process.env.SMTP_HOST || 'smtp.gmail.com',
  port:   Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

export const sendPasswordResetEmail = async (
  to: string, name: string, resetUrl: string
): Promise<void> => {
  await transport.sendMail({
    from:    process.env.EMAIL_FROM || 'GreenRoots ONG <noreply@greenroots.org>',
    to,
    subject: 'GreenRoots ONG — Password reset / Restablecimiento de contraseña',
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto">
        <h2 style="color:#3B6D11">GreenRoots ONG</h2>
        <p>Hello ${name} / Hola ${name},</p>
        <p>Click the link below to reset your password. It expires in <strong>1 hour</strong>.</p>
        <p>Haz clic abajo para restablecer tu contraseña. Expira en <strong>1 hora</strong>.</p>
        <a href="${resetUrl}"
           style="display:inline-block;margin:16px 0;padding:10px 22px;background:#3B6D11;color:#fff;border-radius:6px;text-decoration:none;font-weight:500">
          Reset password / Restablecer contraseña
        </a>
        <p style="color:#888;font-size:12px">If you did not request this, ignore this email.<br>
        Si no solicitaste esto, ignora este correo.</p>
      </div>`,
  });
};

export const sendGenericEmail = async (
  to: string, subject: string, html: string
): Promise<void> => {
  await transport.sendMail({
    from: process.env.EMAIL_FROM || 'GreenRoots ONG <noreply@greenroots.org>',
    to, subject, html,
  });
};
