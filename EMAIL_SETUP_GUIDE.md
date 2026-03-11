# ✉️ WrokoFlow Email Setup Guide

## Current Status
- ✅ Edge Function code is deployed: `supabase/functions/send-email/index.ts`
- ✅ Database invite schema is complete with tests passing (121/121)
- ✅ Resend API key is valid: `re_4U8ir9Zh_5cnMTUBZuhtoC4qP5pY5qdXE`
- ❌ Secrets not yet set in Supabase
- ❌ Edge Function cannot send real emails until secrets are configured

## Step 1: Set Supabase Secrets (Required)

You need to add 2 secrets to your Supabase project: `RESEND_API_KEY` and `FROM_EMAIL`.

### Via Supabase Dashboard (Easy, 2 minutes)

1. **Open Supabase Console**
   ```
   https://app.supabase.com/project/wormvgagpkqgbftxsikk/functions
   ```

2. **Click the `send-email` function** in the list

3. **Click "Settings"** (gear icon, top right)

4. **Click "New Secret"** button

5. **Add Secret #1: RESEND_API_KEY**
   - Key: `RESEND_API_KEY`
   - Value: `re_4U8ir9Zh_5cnMTUBZuhtoC4qP5pY5qdXE`
   - Click "Save"

6. **Add Secret #2: FROM_EMAIL**
   - Key: `FROM_EMAIL`
   - Value: `WrokoFlow <noreply@wrokoflow.com>`
   - Click "Save"

7. **Wait 2-3 seconds** for secrets to propagate

✅ Done! Secrets are now live.

### Via Supabase CLI (Alternative)

If you have Supabase CLI installed:

```bash
# Make sure you're logged in
supabase login

# Set the secrets (from d:\WrokoFlow directory)
supabase secrets set RESEND_API_KEY="re_4U8ir9Zh_5cnMTUBZuhtoC4qP5pY5qdXE"
supabase secrets set FROM_EMAIL="WrokoFlow <noreply@wrokoflow.com>"
```

## Step 2: Test the Setup (1 minute)

Once secrets are set, run:

```bash
cd d:\WrokoFlow
pnpm email:setup
```

Expected output:
```
▸ 3. Test Edge Function (send-email)
✓ Valid test email
✓ Invalid email format
✓ Missing recipient
✓ HTML email with styling
✓ Real user invite template

▸ 4. Results Summary
5 passed  0 failed  / 5 total

✓ All tests passed!
```

## Step 3: Verify in Resend Dashboard (Optional, 30 sec)

Open: https://resend.com/emails

You should see test emails appear in the list (they may take 10-30 seconds to show up).

Check:
- ✓ Sender address shows `noreply@wrokoflow.com`
- ✓ Subject lines visible
- ✓ HTML email preview looks good

## Step 4: Test the UI (2 minutes)

1. Start the dev server:
   ```bash
   pnpm dev
   ```

2. Open http://localhost:5173 in your browser

3. Navigate to: **Settings** → **Members** → **Invite**

4. Send an invite:
   - Enter email: any test email
   - Select role: "Editor"
   - Click "Send Email"
   - You should see a success toast

5. Check Resend dashboard:
   - The invite email should appear in the list
   - Click it to verify formatting and invite link

## Step 5: Accept an Invitation (1 minute)

1. Copy **one invite link** from the pending invites list

2. Open it in an **incognito/private browser tab** (fresh login)

3. Click "Log in with Google"

4. After login, you should see a page confirming you're added to the project

5. Return to the main app → Settings → Members

6. Verify the new member appears with the correct role

---

## 🚨 Troubleshooting

### Problem: "Edge Function returned a non-2xx status code"
**Cause**: Secrets not set yet in Supabase
**Fix**: Complete Step 1 above

### Problem: Email not appearing in Resend dashboard
**Cause**: Function failing silently, or email being rejected
**Fix**: Check Supabase Edge Function logs:
- Dashboard: Project → Edge Functions → send-email → Logs
- Local: `supabase functions develop` then run tests

### Problem: Invalid email rejected, but it should work
**Cause**: Email validation is correct
**Fix**: Double-check the email format. Function rejects:
- Missing `to` field
- Malformed email addresses (e.g., `not-an-email`)
- Empty recipient

---

## 📊 What We've Built

| Component | Status | Details |
|-----------|--------|---------|
| Database Schema | ✅ | invite_links table + RLS policies |
| Invite Codes | ✅ | Cryptographically random, 8-char, unique |
| Invite Validation | ✅ | Expiry (7 days), revoke, accept logic |
| Edge Function | ✅ | Deno function handles HTTP requests |
| Email Service | ✅ | Resend API integration for sending |
| React Hooks | ✅ | useInviteLinks, useSendEmailInvite, etc. |
| Integration Tests | ✅ | 121/121 tests passing |
| UI Component | 🔄 | In Settings → Members (ready to test) |
| Secrets | ⏳ | Awaiting Step 1 above |

---

## 🔗 Useful Links

- **Supabase Project**: https://app.supabase.com/project/wormvgagpkqgbftxsikk
- **Resend Dashboard**: https://resend.com/emails
- **Resend Docs**: https://resend.com/docs
- **Supabase Edge Functions**: https://supabase.com/docs/guides/functions

---

## Next Steps After Email Works

Once invites are sending and being accepted:

1. **Test concurrent invites** (invite 3+ people at once)
2. **Test member role changes** (update member role, verify permissions)
3. **Test project permissions** (editor vs member vs owner roles)
4. **Test real user flows** (Google login with different accounts)
5. **Monitor Resend analytics** (delivery rates, bounces)

---

## 📝 Quick Checklist

- [ ] Set RESEND_API_KEY in Supabase secrets
- [ ] Set FROM_EMAIL in Supabase secrets
- [ ] Run `pnpm email:setup` and see all 5 tests pass
- [ ] Check Resend dashboard for test emails
- [ ] Test UI invite flow
- [ ] Accept an invitation via browser
- [ ] Verify member appears in members list

**Estimated total time: 5 minutes** ⏱️
