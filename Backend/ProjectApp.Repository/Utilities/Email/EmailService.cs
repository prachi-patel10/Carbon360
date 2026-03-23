using Microsoft.Extensions.Options;
using ProjectApp.Core.Models;
using ProjectApp.Repository.Interfaces.Email;
using System.Net;
using System.Net.Mail;

namespace ProjectApp.Repository.Utilities.Email
{
    public class EmailService : IEmailService  
    {
        private readonly EmailSettings _settings;

        public EmailService(IOptions<EmailSettings> settings)
        {
            _settings = settings.Value;
        }

        public async Task SendPasswordResetEmailAsync(string toEmail, string resetLink)
        {
            var smtp = new SmtpClient(_settings.Host)
            {
                Port = _settings.Port,
                UseDefaultCredentials = false,
                Credentials = new NetworkCredential(_settings.Username, _settings.Password),
                EnableSsl = true
            };

            var mail = new MailMessage
            {
                From = new MailAddress(_settings.From, _settings.DisplayName),
                Subject = "Carbon360 - Reset Your Password",
                Body = $@"
                <div style='font-family:Arial,sans-serif;max-width:500px;margin:auto;'>
                    <h2 style='color:#2e7d32;'>Carbon360 Password Reset</h2>
                    <p>Hello,</p>
                    <p>We received a request to reset your password.</p>
                    <p>Click the button below — this link expires in <b>1 hour</b>.</p>
                    <a href='{resetLink}' 
                       style='display:inline-block;padding:12px 24px;
                              background:linear-gradient(135deg,#4caf50,#2e7d32);
                              color:white;border-radius:8px;
                              text-decoration:none;font-weight:bold;margin:16px 0;'>
                        Reset Password
                    </a>
                    <p style='color:#999;font-size:12px;'>
                        If you didn't request this, you can safely ignore this email.
                    </p>
                </div>",
                IsBodyHtml = true
            };

            mail.To.Add(toEmail);
            await smtp.SendMailAsync(mail);
        }
    }
}