import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

/**
 * Serviço de email transacional via Nodemailer.
 * Em dev: usa Mailtrap SMTP para captura sem envio real.
 * Graceful degradation: se MAIL_HOST não configurado, loga aviso e pula envio.
 * @see ADR 0008 — Email transacional
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;

  constructor() {
    const host = process.env.MAIL_HOST;
    if (!host) {
      this.logger.warn('MAIL_HOST not set — email sending disabled (graceful degradation)');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port: parseInt(process.env.MAIL_PORT ?? '587', 10),
      auth: {
        user: process.env.MAIL_USER ?? '',
        pass: process.env.MAIL_PASS ?? '',
      },
    });
  }

  /**
   * Envia email de convite para um endereço.
   * Falha silenciosa: se SMTP não configurado ou envio falhar, loga o erro sem lançar exceção.
   * @param to - Email do destinatário
   * @param inviteUrl - URL completa do convite (ex: http://localhost:3000/invite/uuid)
   * @param orgName - Nome da organização que está convidando
   */
  async sendInvite(to: string, inviteUrl: string, orgName: string): Promise<void> {
    if (!this.transporter) {
      this.logger.warn(`[sendInvite] SMTP not configured — skipping email to ${to}`);
      return;
    }

    const html = `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1a1a1a;">Você foi convidado!</h2>
        <p style="color: #444;">
          Você recebeu um convite para entrar no time <strong>${orgName}</strong> no Zenkai.
        </p>
        <p style="margin: 32px 0;">
          <a href="${inviteUrl}"
             style="background: #0070f3; color: white; padding: 12px 24px;
                    border-radius: 6px; text-decoration: none; font-weight: 600;">
            Aceitar convite
          </a>
        </p>
        <p style="color: #888; font-size: 12px;">
          Se você não esperava este convite, pode ignorar este email.<br/>
          Link: <a href="${inviteUrl}">${inviteUrl}</a>
        </p>
      </div>
    `;

    try {
      await this.transporter.sendMail({
        from: process.env.MAIL_FROM ?? 'noreply@zenkai.app',
        to,
        subject: `Convite para ${orgName} no Zenkai`,
        html,
      });
      this.logger.log(`[sendInvite] Email sent to ${to}`);
    } catch (err) {
      this.logger.error(`[sendInvite] Failed to send email to ${to}: ${(err as Error).message}`);
    }
  }
}
