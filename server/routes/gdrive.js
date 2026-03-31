import { Router } from 'express';
import { google } from 'googleapis';
import { query } from '../db.js';
import { requireAuth } from '../middleware.js';

const router = Router();

const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/userinfo.email',
];

function getOAuth2Client() {
  const appUrl = process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`;
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${appUrl}/api/gdrive/callback`
  );
}

async function getSetting(key) {
  const { rows } = await query('SELECT value FROM settings WHERE key = $1', [key]);
  return rows[0]?.value ?? null;
}

async function setSetting(key, value) {
  await query(
    `INSERT INTO settings (key, value, updated_at) VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
    [key, value]
  );
}

router.get('/status', requireAuth, async (_req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.json({ configured: false, connected: false });
  }
  const tokens = await getSetting('google_tokens');
  const email = await getSetting('google_email');
  const lastBackup = await getSetting('google_last_backup');
  res.json({ configured: true, connected: !!tokens, email, lastBackup });
});

router.get('/auth', requireAuth, (_req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.status(400).json({ error: 'Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.' });
  }
  const oauth2Client = getOAuth2Client();
  const url = oauth2Client.generateAuthUrl({ access_type: 'offline', scope: SCOPES, prompt: 'consent' });
  res.redirect(url);
});

router.get('/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.redirect('/#/settings?error=no_code');
  try {
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();

    await setSetting('google_tokens', JSON.stringify(tokens));
    await setSetting('google_email', userInfo.data.email || '');
    res.redirect('/#/settings?success=connected');
  } catch (err) {
    console.error('OAuth callback error:', err);
    res.redirect('/#/settings?error=auth_failed');
  }
});

router.delete('/disconnect', requireAuth, async (_req, res) => {
  await query("DELETE FROM settings WHERE key IN ('google_tokens','google_email','google_last_backup')");
  res.json({ success: true });
});

router.post('/backup', requireAuth, async (_req, res) => {
  const tokensStr = await getSetting('google_tokens');
  if (!tokensStr) return res.status(400).json({ error: 'Google Drive not connected' });

  const [si, ii, pi, pki, oi] = await Promise.all([
    query('SELECT * FROM store_items ORDER BY created_at ASC'),
    query('SELECT * FROM ingredients ORDER BY created_at ASC'),
    query('SELECT * FROM production_batches ORDER BY created_at ASC'),
    query('SELECT * FROM packages ORDER BY created_at ASC'),
    query('SELECT * FROM orders ORDER BY created_at ASC'),
  ]);

  const backupData = {
    backup_date: new Date().toISOString(),
    version: '1.0',
    data: {
      store: si.rows,
      ingredients: ii.rows,
      production: pi.rows,
      packages: pki.rows,
      orders: oi.rows,
    },
  };

  try {
    const oauth2Client = getOAuth2Client();
    const tokens = JSON.parse(tokensStr);
    oauth2Client.setCredentials(tokens);

    if (tokens.expiry_date && tokens.expiry_date < Date.now()) {
      const { credentials } = await oauth2Client.refreshAccessToken();
      await setSetting('google_tokens', JSON.stringify(credentials));
      oauth2Client.setCredentials(credentials);
    }

    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    const { Readable } = await import('stream');
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `DEFFIZZY_Backup_${dateStr}.json`;

    const fileContent = JSON.stringify(backupData, null, 2);
    const stream = Readable.from([fileContent]);

    await drive.files.create({
      requestBody: { name: fileName, mimeType: 'application/json' },
      media: { mimeType: 'application/json', body: stream },
    });

    await setSetting('google_last_backup', new Date().toISOString());
    res.json({ success: true, fileName });
  } catch (err) {
    console.error('Google Drive backup error:', err);
    res.status(500).json({ error: 'Backup failed: ' + err.message });
  }
});

export default router;
