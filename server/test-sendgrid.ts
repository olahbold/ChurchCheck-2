import { MailService } from '@sendgrid/mail';

const testSendGrid = async () => {
  if (!process.env.SENDGRID_API_KEY) {
    console.error("SENDGRID_API_KEY not found");
    return;
  }

  console.log('SendGrid API Key present:', !!process.env.SENDGRID_API_KEY);
  console.log('SendGrid API Key length:', process.env.SENDGRID_API_KEY.length);
  
  const mailService = new MailService();
  mailService.setApiKey(process.env.SENDGRID_API_KEY);

  try {
    const msg = {
      to: 'oginniolayinkajulius@gmail.com',
      from: 'oginniolayinkajulius@gmail.com', // Use your verified sender email
      subject: 'ChurchConnect: SendGrid Test Email',
      text: 'This is a test email from ChurchConnect to verify SendGrid integration with your verified sender.',
      html: '<p>This is a test email from <strong>ChurchConnect</strong> to verify SendGrid integration with your verified sender.</p>'
    };

    console.log('Attempting to send test email...');
    const result = await mailService.send(msg);
    console.log('Email sent successfully!', result);
  } catch (error) {
    console.error('SendGrid test failed:', error);
    if (error.response) {
      console.error('Error details:', JSON.stringify(error.response.body, null, 2));
    }
  }
};

testSendGrid();