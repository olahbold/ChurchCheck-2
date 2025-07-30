import { MailService } from '@sendgrid/mail';

let mailService: MailService | null = null;

// Initialize SendGrid if API key is available
if (process.env.SENDGRID_API_KEY) {
  try {
    mailService = new MailService();
    mailService.setApiKey(process.env.SENDGRID_API_KEY);
    console.log('SendGrid initialized successfully');
  } catch (error) {
    console.error('Failed to initialize SendGrid:', error);
  }
}

interface Member {
  id: string;
  firstName: string;
  surname: string;
  phone?: string | null;
  email?: string | null;
}

// Create a console notification as fallback
function logNotification(member: Member, contactMethod: string, type: 'email' | 'sms') {
  const timestamp = new Date().toISOString();
  const notification = {
    timestamp,
    type,
    member: {
      name: `${member.firstName} ${member.surname}`,
      email: member.email,
      phone: member.phone
    },
    contactMethod,
    recipient: 'oginniolayinkajulius@gmail.com',
    status: 'logged'
  };

  console.log('\n=== FOLLOW-UP NOTIFICATION ===');
  console.log(JSON.stringify(notification, null, 2));
  console.log('===============================\n');
}

export async function sendFollowUpEmail(member: Member, contactMethod: string): Promise<boolean> {
  try {
    console.log(`📧 Attempting to send EMAIL notification for ${member.firstName} ${member.surname}`);
    
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

    // Try SendGrid first if available
    if (mailService) {
      try {
        const emailData = {
          to: 'oginniolayinkajulius@gmail.com',
          from: 'noreply@example.com', // Use a simple domain
          subject: `ChurchConnect: Follow-up Complete - ${member.firstName} ${member.surname}`,
          html: emailContent,
          text: `ChurchConnect Follow-up Notification\n\nMember: ${member.firstName} ${member.surname}\nContact Method: ${contactMethod.toUpperCase()}\nDate: ${new Date().toLocaleDateString()}\nTime: ${new Date().toLocaleTimeString()}\n\nThis member has been successfully contacted and marked as followed up.`
        };

        const result = await mailService.send(emailData);
        console.log(`✅ Email sent successfully via SendGrid for ${member.firstName} ${member.surname}`);
        return true;
      } catch (sendGridError) {
        console.log(`⚠️ SendGrid failed, using console logging instead:`);
        console.log(sendGridError.response?.body?.errors?.[0]?.message || sendGridError.message);
      }
    }

    // Fallback to console logging
    logNotification(member, contactMethod, 'email');
    console.log(`📝 EMAIL notification logged for ${member.firstName} ${member.surname} - Check console above for details`);
    console.log(`📧 Would email: oginniolayinkajulius@gmail.com`);
    console.log(`📋 Subject: ChurchConnect: Follow-up Complete - ${member.firstName} ${member.surname}`);
    
    return true;
  } catch (error) {
    console.error('Email notification failed:', error);
    return false;
  }
}

export async function sendFollowUpSMS(member: Member, contactMethod: string): Promise<boolean> {
  try {
    console.log(`📱 Attempting to send SMS notification for ${member.firstName} ${member.surname}`);
    
    const smsMessage = `ChurchConnect: ${member.firstName} ${member.surname} was contacted via ${contactMethod.toUpperCase()} on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}. Follow-up complete.`;
    
    // Log the SMS notification
    logNotification(member, contactMethod, 'sms');
    
    console.log(`📝 SMS notification logged for ${member.firstName} ${member.surname}`);
    console.log(`📱 Would SMS to: ${member.phone || 'No phone number'} (+4407456183646)`);
    console.log(`💬 Message: ${smsMessage}`);
    console.log(`📧 Notification also logged for: oginniolayinkajulius@gmail.com`);
    
    // For real SMS, you would integrate with Twilio:
    // const client = twilio(accountSid, authToken);
    // await client.messages.create({
    //   body: smsMessage,
    //   from: '+1234567890', // Your Twilio number
    //   to: '+4407456183646'
    // });
    
    return true;
  } catch (error) {
    console.error('SMS notification error:', error);
    return false;
  }
}