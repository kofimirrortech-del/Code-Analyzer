import webpush from 'web-push';
import { query } from './db.js';

let _ready = false;

export async function initVapid() {
  if (_ready) return;
  const { rows } = await query(`SELECT value FROM settings WHERE key='vapid_keys'`);
  let keys;
  if (rows[0]) {
    keys = JSON.parse(rows[0].value);
  } else {
    keys = webpush.generateVAPIDKeys();
    await query(
      `INSERT INTO settings (key,value) VALUES ('vapid_keys',$1) ON CONFLICT (key) DO NOTHING`,
      [JSON.stringify(keys)]
    );
  }
  webpush.setVapidDetails('mailto:admin@deffizzy.local', keys.publicKey, keys.privateKey);
  _ready = true;
}

export async function getVapidPublicKey() {
  await initVapid();
  const { rows } = await query(`SELECT value FROM settings WHERE key='vapid_keys'`);
  return JSON.parse(rows[0].value).publicKey;
}

export async function sendPush(targetRole, title, body, url = '/') {
  try {
    await initVapid();
    const { rows } = await query(
      `SELECT endpoint, subscription FROM push_subscriptions WHERE target_role=$1`,
      [targetRole]
    );
    if (!rows.length) return;
    const payload = JSON.stringify({ title, body, url });
    for (const row of rows) {
      try {
        await webpush.sendNotification(row.subscription, payload);
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await query(`DELETE FROM push_subscriptions WHERE endpoint=$1`, [row.endpoint]);
        }
      }
    }
  } catch (e) {
    console.error('Push send error:', e.message);
  }
}
