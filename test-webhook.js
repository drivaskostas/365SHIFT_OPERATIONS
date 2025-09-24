// Test script to manually call the webhook handler
const testWebhookCall = async () => {
  const testPayload = {
    type: "email.delivered",
    created_at: new Date().toISOString(),
    data: {
      email_id: "5841c9d5-97bb-4eb4-8081-42a59bdd60c5", // Using your real email ID
      from: "test@ovitsec.com",
      to: ["drivas@ovitsec.com"],
      subject: "Test webhook",
      delivered_at: new Date().toISOString()
    }
  };

  try {
    const response = await fetch('https://igcqqrcdtqpecopvuuva.supabase.co/functions/v1/resend-webhook-handler', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload)
    });

    const result = await response.text();
    console.log('Webhook test result:', result);
  } catch (error) {
    console.error('Webhook test failed:', error);
  }
};

testWebhookCall();