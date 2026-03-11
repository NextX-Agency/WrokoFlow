import { supabase } from "./supabase"

/**
 * Email service for WrokoFlow.
 * Uses Supabase Edge Functions to send emails via Resend.
 * Falls back to Supabase's built-in email for auth-related emails.
 */

interface SendEmailParams {
  to: string
  subject: string
  html: string
}

export async function sendEmail(params: SendEmailParams): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke("send-email", {
      body: params,
    })
    if (error) {
      console.error("Email send error:", error)
      return { success: false, error: error.message }
    }
    return { success: true, ...data }
  } catch (err) {
    console.error("Email service error:", err)
    return { success: false, error: "Failed to send email" }
  }
}

export function buildInviteEmailHtml({
  inviterName,
  projectName,
  role,
  inviteUrl,
}: {
  inviterName: string
  projectName: string
  role: string
  inviteUrl: string
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#FAF8F5;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#FFFFFF;border-radius:16px;overflow:hidden;border:1px solid #E4DDD2;">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#C97C5C,#B07C4F);padding:32px 40px;text-align:center;">
      <h1 style="color:#FFFFFF;font-size:24px;margin:0;font-weight:700;letter-spacing:-0.02em;">WrokoFlow</h1>
      <p style="color:rgba(255,255,255,0.8);font-size:14px;margin:8px 0 0;">Team Collaboration</p>
    </div>
    
    <!-- Body -->
    <div style="padding:40px;">
      <h2 style="color:#2D2A26;font-size:20px;margin:0 0 16px;font-weight:600;">You're invited to collaborate!</h2>
      <p style="color:#7A7267;font-size:15px;line-height:1.6;margin:0 0 24px;">
        <strong style="color:#4A4540;">${inviterName}</strong> has invited you to join 
        <strong style="color:#4A4540;">${projectName}</strong> as ${role === "editor" ? "an" : "a"} 
        <strong style="color:#B07C4F;">${role}</strong>.
      </p>
      
      <!-- CTA Button -->
      <div style="text-align:center;margin:32px 0;">
        <a href="${inviteUrl}" 
           style="display:inline-block;background:#B07C4F;color:#FFFFFF;padding:14px 36px;border-radius:12px;text-decoration:none;font-weight:600;font-size:15px;">
          Accept Invitation
        </a>
      </div>
      
      <p style="color:#A09890;font-size:13px;line-height:1.6;margin:24px 0 0;">
        This invitation expires in 30 days. If you didn't expect this email, you can safely ignore it.
      </p>
      
      <!-- Fallback link -->
      <div style="margin-top:24px;padding:16px;background:#F5F3F0;border-radius:8px;">
        <p style="color:#7A7267;font-size:12px;margin:0 0 4px;">Or copy this link:</p>
        <p style="color:#B07C4F;font-size:12px;word-break:break-all;margin:0;">${inviteUrl}</p>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="padding:20px 40px;background:#FAF8F5;border-top:1px solid #E4DDD2;text-align:center;">
      <p style="color:#A09890;font-size:12px;margin:0;">&copy; ${new Date().getFullYear()} WrokoFlow. Built with purpose.</p>
    </div>
  </div>
</body>
</html>`
}

export function buildNotificationEmailHtml({
  title,
  message,
  actionUrl,
  actionLabel,
}: {
  title: string
  message: string
  actionUrl?: string
  actionLabel?: string
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#FAF8F5;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#FFFFFF;border-radius:16px;overflow:hidden;border:1px solid #E4DDD2;">
    <div style="background:linear-gradient(135deg,#C97C5C,#B07C4F);padding:24px 40px;text-align:center;">
      <h1 style="color:#FFFFFF;font-size:20px;margin:0;font-weight:700;">WrokoFlow</h1>
    </div>
    <div style="padding:32px 40px;">
      <h2 style="color:#2D2A26;font-size:18px;margin:0 0 12px;font-weight:600;">${title}</h2>
      <p style="color:#7A7267;font-size:14px;line-height:1.6;margin:0 0 24px;">${message}</p>
      ${actionUrl ? `
      <div style="text-align:center;">
        <a href="${actionUrl}" 
           style="display:inline-block;background:#B07C4F;color:#FFFFFF;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px;">
          ${actionLabel || "View Details"}
        </a>
      </div>` : ""}
    </div>
    <div style="padding:16px 40px;background:#FAF8F5;border-top:1px solid #E4DDD2;text-align:center;">
      <p style="color:#A09890;font-size:11px;margin:0;">&copy; ${new Date().getFullYear()} WrokoFlow</p>
    </div>
  </div>
</body>
</html>`
}
