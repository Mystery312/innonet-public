from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

from src.config import get_settings

settings = get_settings()


class EmailService:
    def __init__(self):
        self.client = SendGridAPIClient(settings.sendgrid_api_key) if settings.sendgrid_api_key else None
        self.from_email = settings.sendgrid_from_email

    async def send_email(self, to_email: str, subject: str, html_content: str) -> bool:
        if not self.client:
            # In development, just log the email
            print(f"[DEV] Email to {to_email}: {subject}")
            return True

        message = Mail(
            from_email=self.from_email,
            to_emails=to_email,
            subject=subject,
            html_content=html_content,
        )

        try:
            self.client.send(message)
            return True
        except Exception as e:
            print(f"Failed to send email: {e}")
            return False

    async def send_waitlist_confirmation(self, to_email: str) -> bool:
        subject = "Welcome to the Innonet Waitlist!"
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 40px 20px; }}
                .header {{ text-align: center; margin-bottom: 30px; }}
                .logo {{ font-size: 28px; font-weight: bold; color: #2563eb; }}
                .content {{ background: #f8fafc; border-radius: 8px; padding: 30px; }}
                h1 {{ color: #1e293b; font-size: 24px; margin-bottom: 16px; }}
                p {{ color: #475569; margin-bottom: 16px; }}
                .footer {{ text-align: center; margin-top: 30px; color: #94a3b8; font-size: 14px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">Innonet</div>
                </div>
                <div class="content">
                    <h1>You're on the list!</h1>
                    <p>Thanks for joining the Innonet waitlist. We're building something special for innovators like you.</p>
                    <p>With Innonet, you'll be able to:</p>
                    <ul>
                        <li>Discover nearby projects, hackathons, and builders</li>
                        <li>Connect with collaborators using AI-powered matching</li>
                        <li>Turn your ideas into impact, faster</li>
                    </ul>
                    <p>We'll notify you as soon as early access is available.</p>
                </div>
                <div class="footer">
                    <p>&copy; 2024 Innonet. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
        return await self.send_email(to_email, subject, html_content)

    async def send_ticket_confirmation(
        self, to_email: str, event_name: str, ticket_code: str, event_date: str
    ) -> bool:
        subject = f"Your Ticket for {event_name}"
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 40px 20px; }}
                .header {{ text-align: center; margin-bottom: 30px; }}
                .logo {{ font-size: 28px; font-weight: bold; color: #2563eb; }}
                .ticket {{ background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%); border-radius: 12px; padding: 30px; color: white; text-align: center; }}
                .ticket h2 {{ margin: 0 0 10px 0; font-size: 20px; }}
                .ticket-code {{ font-size: 32px; font-weight: bold; letter-spacing: 2px; margin: 20px 0; padding: 15px; background: rgba(255,255,255,0.2); border-radius: 8px; }}
                .event-details {{ background: #f8fafc; border-radius: 8px; padding: 20px; margin-top: 20px; }}
                .footer {{ text-align: center; margin-top: 30px; color: #94a3b8; font-size: 14px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">Innonet</div>
                </div>
                <div class="ticket">
                    <h2>You're In!</h2>
                    <p>Your ticket for</p>
                    <h1 style="margin: 10px 0;">{event_name}</h1>
                    <div class="ticket-code">{ticket_code}</div>
                    <p>Present this code at the event</p>
                </div>
                <div class="event-details">
                    <p><strong>Event:</strong> {event_name}</p>
                    <p><strong>Date:</strong> {event_date}</p>
                    <p><strong>Ticket Code:</strong> {ticket_code}</p>
                </div>
                <div class="footer">
                    <p>&copy; 2024 Innonet. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
        return await self.send_email(to_email, subject, html_content)
