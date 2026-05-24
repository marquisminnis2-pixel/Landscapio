import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendVerificationEmail(toEmail: string, token: string) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const verifyUrl = `${frontendUrl}/verify-email?token=${token}`;

  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'Genesis <noreply@spotqeys.com>',
    to: toEmail,
    subject: 'Verify your Genesis account',
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;background:#0D1117;color:#fff;border-radius:16px;padding:48px 40px;">
        <div style="margin-bottom:32px;">
          <div style="display:inline-flex;align-items:center;gap:10px;">
            <div style="width:36px;height:36px;background:linear-gradient(135deg,#34D399,#10B981);border-radius:10px;display:flex;align-items:center;justify-content:center;">
              <span style="color:white;font-size:16px;">✦</span>
            </div>
            <span style="font-size:20px;font-weight:700;color:#fff;letter-spacing:-0.02em;">Genesis</span>
          </div>
        </div>

        <h1 style="font-size:28px;font-weight:700;color:#fff;margin:0 0 12px;letter-spacing:-0.03em;">Welcome to Genesis</h1>
        <p style="font-size:15px;color:rgba(255,255,255,0.6);margin:0 0 32px;line-height:1.6;">
          You're almost there. Click the button below to verify your email address and activate your account.
        </p>

        <a href="${verifyUrl}"
           style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#34D399,#10B981);color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:15px;letter-spacing:-0.01em;">
          Verify My Email
        </a>

        <p style="font-size:12px;color:rgba(255,255,255,0.3);margin:32px 0 0;line-height:1.6;">
          This link expires in 24 hours. If you didn't create a Genesis account, you can safely ignore this email.
        </p>
        <p style="font-size:12px;color:rgba(255,255,255,0.2);margin:8px 0 0;">
          Or copy this URL: ${verifyUrl}
        </p>
      </div>
    `,
  });
}
