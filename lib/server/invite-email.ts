type InviteEmailInput = {
  to: string;
  inviteLink: string;
  workspaceName: string;
  role: string;
  expiresInDays: number;
  language: "en" | "fr" | "ar";
};

function buildLocalizedTemplate(input: InviteEmailInput) {
  if (input.language === "fr") {
    const subject = `Invitation Sysnova AI - ${input.workspaceName}`;
    const text = [
      `Bonjour,`,
      ``,
      `Vous etes invite(e) a rejoindre l'espace "${input.workspaceName}" sur Sysnova AI avec le role "${input.role}".`,
      `Le lien expire dans ${input.expiresInDays} jour(s).`,
      ``,
      `Lien d'invitation: ${input.inviteLink}`,
      ``,
      `Si vous n'attendiez pas cet email, ignorez-le.`
    ].join("\n");
    return { subject, text };
  }

  if (input.language === "ar") {
    const subject = `دعوة Sysnova AI - ${input.workspaceName}`;
    const text = [
      `مرحبا،`,
      ``,
      `تمت دعوتك للانضمام إلى مساحة العمل "${input.workspaceName}" في Sysnova AI بدور "${input.role}".`,
      `تنتهي صلاحية الرابط خلال ${input.expiresInDays} يوم.`,
      ``,
      `رابط الدعوة: ${input.inviteLink}`,
      ``,
      `إذا لم تكن تتوقع هذا البريد، يمكنك تجاهله.`
    ].join("\n");
    return { subject, text };
  }

  const subject = `Sysnova AI invite - ${input.workspaceName}`;
  const text = [
    `Hello,`,
    ``,
    `You were invited to join "${input.workspaceName}" on Sysnova AI as "${input.role}".`,
    `This link expires in ${input.expiresInDays} day(s).`,
    ``,
    `Invite link: ${input.inviteLink}`,
    ``,
    `If you did not expect this email, you can ignore it.`
  ].join("\n");
  return { subject, text };
}

type EmailSendResult = {
  delivered: boolean;
  provider: "resend" | "sendgrid" | "none";
  reason?: string;
};

export async function sendInviteEmail(input: InviteEmailInput): Promise<EmailSendResult> {
  const from = process.env.INVITE_EMAIL_FROM?.trim() || "no-reply@sysnova.ai";
  const template = buildLocalizedTemplate(input);
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  const sendgridApiKey = process.env.SENDGRID_API_KEY?.trim();

  if (resendApiKey) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: template.subject,
        text: template.text
      })
    });
    if (response.ok) {
      return { delivered: true, provider: "resend" };
    }
    const reason = await response.text();
    return { delivered: false, provider: "resend", reason };
  }

  if (sendgridApiKey) {
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sendgridApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: input.to }] }],
        from: { email: from },
        subject: template.subject,
        content: [{ type: "text/plain", value: template.text }]
      })
    });
    if (response.ok) {
      return { delivered: true, provider: "sendgrid" };
    }
    const reason = await response.text();
    return { delivered: false, provider: "sendgrid", reason };
  }

  return {
    delivered: false,
    provider: "none",
    reason: "No mail provider configured. Set RESEND_API_KEY or SENDGRID_API_KEY."
  };
}
