import { Test, TestingModule } from '@nestjs/testing';
import { MailService } from './mail.service';

// jest.mock is hoisted — do NOT reference variables declared with const/let here
jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' }),
  }),
}));

// Import nodemailer after the mock so we can access the mock transporter
const nodemailer = require('nodemailer') as typeof import('nodemailer');

describe('MailService', () => {
  let sendMailMock: jest.Mock;

  beforeEach(() => {
    // Access the sendMail mock through the already-created transporter mock
    const transporter = nodemailer.createTransport({} as never);
    sendMailMock = transporter.sendMail as jest.Mock;
    sendMailMock.mockClear();
    sendMailMock.mockResolvedValue({ messageId: 'test-id' });
  });

  describe('when MAIL_HOST is configured', () => {
    let service: MailService;

    beforeEach(async () => {
      process.env.MAIL_HOST = 'smtp.mailtrap.io';
      process.env.MAIL_PORT = '587';
      process.env.MAIL_USER = 'user';
      process.env.MAIL_PASS = 'pass';
      process.env.MAIL_FROM = 'noreply@zenkai.app';

      const module: TestingModule = await Test.createTestingModule({
        providers: [MailService],
      }).compile();

      service = module.get<MailService>(MailService);
    });

    afterEach(() => {
      delete process.env.MAIL_HOST;
      delete process.env.MAIL_PORT;
      delete process.env.MAIL_USER;
      delete process.env.MAIL_PASS;
      delete process.env.MAIL_FROM;
    });

    it('should send invite email successfully', async () => {
      await service.sendInvite('user@example.com', 'http://localhost:3000/invite/abc', 'My Team');

      expect(sendMailMock).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'noreply@zenkai.app',
          to: 'user@example.com',
          subject: 'Convite para My Team no Zenkai',
        }),
      );
    });

    it('should log error but not throw when sendMail fails', async () => {
      sendMailMock.mockRejectedValueOnce(new Error('SMTP connection refused'));

      await expect(
        service.sendInvite('user@example.com', 'http://localhost:3000/invite/abc', 'My Team'),
      ).resolves.toBeUndefined();
    });
  });

  describe('when MAIL_HOST is not configured', () => {
    let service: MailService;

    beforeEach(async () => {
      delete process.env.MAIL_HOST;

      const module: TestingModule = await Test.createTestingModule({
        providers: [MailService],
      }).compile();

      service = module.get<MailService>(MailService);
    });

    it('should skip sending and not call sendMail', async () => {
      await service.sendInvite('user@example.com', 'http://localhost:3000/invite/abc', 'My Team');

      expect(sendMailMock).not.toHaveBeenCalled();
    });
  });
});
