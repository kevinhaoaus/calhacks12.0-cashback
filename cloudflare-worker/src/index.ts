/**
 * Cloudflare Email Worker
 * Receives forwarded emails and sends them to Reclaim.AI API
 */

interface Env {
  API_URL: string;
  API_SECRET?: string;
}

export default {
  async email(message: any, env: Env, ctx: any) {
    try {
      // Extract email details
      const from = message.from;
      const to = message.to;
      const subject = message.headers.get('subject') || '';

      // Get email content
      let text = '';
      let html = '';

      try {
        text = await message.text();
      } catch (e) {
        console.log('Could not extract plain text');
      }

      try {
        html = await message.html();
      } catch (e) {
        console.log('Could not extract HTML');
      }

      // Extract attachments if any
      const attachments = [];
      if (message.attachments) {
        for (const attachment of message.attachments) {
          attachments.push({
            filename: attachment.filename,
            contentType: attachment.contentType,
            size: attachment.size,
          });
        }
      }

      console.log('Processing email:', {
        from,
        to,
        subject,
        hasText: !!text,
        hasHtml: !!html,
        attachmentCount: attachments.length,
      });

      // Send to API
      const response = await fetch(env.API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(env.API_SECRET ? { 'X-API-Secret': env.API_SECRET } : {}),
        },
        body: JSON.stringify({
          from,
          to,
          subject,
          text,
          html,
          attachments,
        }),
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${await response.text()}`);
      }

      const result = await response.json();
      console.log('API response:', result);

      return new Response('Email processed successfully', { status: 200 });
    } catch (error) {
      console.error('Error processing email:', error);
      return new Response(`Error: ${error}`, { status: 500 });
    }
  },
};
