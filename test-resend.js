const { Resend } = require('resend');
require('dotenv').config();

const resend = new Resend(process.env.RESEND_API_KEY);
const AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID || '993e7864-bb3a-4543-a437-a7848b030657';

async function test() {
  const payload1 = {
    email: 'test-resend-create-1@example.com',
    firstName: 'Test1',
    unsubscribed: false,
    audienceId: AUDIENCE_ID,
  };
  console.log('Testing create with audienceId...');
  const res1 = await resend.contacts.create(payload1);
  console.log('Result 1:', res1);

  const payload2 = {
    email: 'test-resend-create-2@example.com',
    firstName: 'Test2',
    unsubscribed: false,
    segments: [AUDIENCE_ID],
  };
  console.log('Testing create with segments array...');
  const res2 = await resend.contacts.create(payload2);
  console.log('Result 2:', res2);
}

test().catch(console.error);
