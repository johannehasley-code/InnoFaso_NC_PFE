export class MockSmsProvider {
  constructor() { this.name = 'mock'; this.outbox = []; this._seq = 0; }
  async send({ to, body, meta = {} }) {
    const message = { id: `sms_${++this._seq}`, to, body, meta, provider: this.name, sentAt: new Date().toISOString() };
    this.outbox.push(message);
    console.log(`[SMS->${to}] ${body}`);
    return message;
  }
}

export class TwilioSmsProvider {
  constructor({ accountSid, authToken, from } = {}) {
    this.name = 'twilio'; this.accountSid = accountSid; this.authToken = authToken; this.from = from; this.outbox = [];
  }
  async send({ to, body, meta = {} }) {
    if (!this.accountSid || !this.authToken) throw new Error('TwilioSmsProvider : identifiants manquants.');
    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: 'Basic ' + Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ To: to, From: this.from, Body: body }),
    });
    if (!res.ok) throw new Error(`Twilio a renvoyé ${res.status}`);
    const data = await res.json();
    const message = { id: data.sid, to, body, meta, provider: this.name, sentAt: new Date().toISOString() };
    this.outbox.push(message);
    return message;
  }
}

export class EmailJsProvider {
  constructor({ serviceId, templateId, publicKey } = {}) {
    this.name       = 'emailjs';
    this.serviceId  = serviceId  || process.env.EMAILJS_SERVICE_ID;
    this.templateId = templateId || process.env.EMAILJS_TEMPLATE_ID;
    this.publicKey  = publicKey  || process.env.EMAILJS_PUBLIC_KEY;
    this.privateKey = process.env.EMAILJS_PRIVATE_KEY || null;
    this.outbox     = [];
  }

  async send({ to, body, meta = {} }) {
    if (!this.serviceId || !this.templateId || !this.publicKey) {
      throw new Error('EmailJsProvider : clés manquantes (EMAILJS_*).');
    }

    const sujet = meta.motif === 'alerte_critique'
      ? `ALERTE CRITIQUE — ${meta.ncId || ''}`
      : `Nouvelle NC assignée — ${meta.ncId || ''}`;

    console.log(`[EmailJS DEBUG] to="${to}" service="${this.serviceId}" template="${this.templateId}"`);

    const payload = {
      service_id:  this.serviceId,
      template_id: this.templateId,
      user_id:     this.publicKey,
      template_params: {
        to_email:         to,
        destinataire_nom: meta.nom || to,
        sujet,
        message:          body,
        numero_nc:        meta.ncId || '—',
      },
    };
    if (this.privateKey) payload.accessToken = this.privateKey;

    const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => String(res.status));
      throw new Error(`EmailJS a renvoyé une erreur : ${detail}`);
    }

    const message = { id: `email_${Date.now()}`, to, body, meta, provider: this.name, sentAt: new Date().toISOString() };
    this.outbox.push(message);
    console.log(`[EMAIL -> ${to}] ${sujet}`);
    return message;
  }
}

export function creerSmsProvider() {
  if (process.env.SMS_PROVIDER === 'twilio') {
    return new TwilioSmsProvider({
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken:  process.env.TWILIO_AUTH_TOKEN,
      from:       process.env.TWILIO_FROM,
    });
  }
  if (process.env.SMS_PROVIDER === 'emailjs') {
    return new EmailJsProvider({
      serviceId:  process.env.EMAILJS_SERVICE_ID,
      templateId: process.env.EMAILJS_TEMPLATE_ID,
      publicKey:  process.env.EMAILJS_PUBLIC_KEY,
    });
  }
  return new MockSmsProvider();
}