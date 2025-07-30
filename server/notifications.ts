import { MailService } from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

const mailService = new MailService();
mailService.setApiKey(process.env.SENDGRID_API_KEY);

interface Member {
  id: string;
  firstName: string;
  surname: string;
  phone?: string | null;
  email?: string | null;
}

export async function sendFollowUpEmail(member: Member, contactMethod: string): Promise<boolean> {
  try {
    const emailContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">ChurchConnect Follow-up Notification</h2>
      
      <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: #374151; margin-top: 0;">Member Contact Record</h3>
        
        <p><strong>Member:</strong> ${member.firstName} ${member.surname}</p>
        <p><strong>Contact Method:</strong> ${contactMethod.toUpperCase()}</p>
        <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
        <p><strong>Time:</strong> ${new Date().toLocaleTimeString()}</p>
      </div>
      
      <div style="background-color: #ecfdf5; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981;">
        <p style="margin: 0; color: #065f46;">
          <strong>✓ Follow-up Complete:</strong> This member has been successfully contacted and marked as followed up in the church management system.
        </p>
      </div>
      
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
      
      <p style="color: #6b7280; font-size: 14px;">
        This notification was sent automatically by ChurchConnect when a church staff member marked ${member.firstName} ${member.surname} as contacted via ${contactMethod}.
      </p>
    </div>
    `;

    await mailService.send({
      to: 'oginniolayinkajulius@gmail.com',
      from: 'noreply@churchconnect.app', // This will need to be verified in SendGrid
      subject: `Follow-up Complete: ${member.firstName} ${member.surname}`,
      html: emailContent,
      text: `ChurchConnect Follow-up Notification\n\nMember: ${member.firstName} ${member.surname}\nContact Method: ${contactMethod.toUpperCase()}\nDate: ${new Date().toLocaleDateString()}\nTime: ${new Date().toLocaleTimeString()}\n\nThis member has been successfully contacted and marked as followed up.`
    });

    console.log(`Follow-up email sent successfully for ${member.firstName} ${member.surname}`);
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    return false;
  }
}

export async function sendFollowUpSMS(member: Member, contactMethod: string): Promise<boolean> {
  try {
    // For SMS, we'll use a webhook service like Twilio or similar
    // For now, I'll create a simple notification that could be extended
    
    const smsMessage = `ChurchConnect: ${member.firstName} ${member.surname} was contacted via ${contactMethod.toUpperCase()} on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}. Follow-up complete.`;
    
    // In a real implementation, you would integrate with Twilio or another SMS service
    // For now, we'll send an email notification about the SMS action
    await mailService.send({
      to: 'oginniolayinkajulius@gmail.com',
      from: 'noreply@churchconnect.app',
      subject: `SMS Follow-up Notification: ${member.firstName} ${member.surname}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">SMS Follow-up Notification</h2>
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px;">
            <p><strong>SMS would be sent to:</strong> ${member.phone || 'No phone number'}</p>
            <p><strong>Message:</strong></p>
            <div style="background-color: #e5e7eb; padding: 10px; border-radius: 4px; font-family: monospace;">
              ${smsMessage}
            </div>
          </div>
          <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
            Note: To send real SMS, integrate with Twilio or similar SMS service. Phone: +4407456183646
          </p>
        </div>
      `,
      text: `SMS Follow-up Notification\n\nSMS would be sent to: ${member.phone || 'No phone number'}\nMessage: ${smsMessage}\n\nNote: To send real SMS, integrate with Twilio or similar SMS service. Phone: +4407456183646`
    });

    console.log(`SMS notification email sent for ${member.firstName} ${member.surname}`);
    return true;
  } catch (error) {
    console.error('SMS notification error:', error);
    return false;
  }
}