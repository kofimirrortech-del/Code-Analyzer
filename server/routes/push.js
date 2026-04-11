import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware.js';
import { getVapidPublicKey, initVapid } from '../push.js';

const router = Router();

router.get('/vapid-key', async (_req, res) => {
  try {
    const publicKey = await getVapidPublicKey();
    res.json({ publicKey });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/subscribe', requireAuth, async (req, res) => {
  try {
    const { subscription } = req.body;
    if (!subscription?.endpoint) return res.status(400).json({ error: 'Invalid subscription' });
    const role = req.user.role;
    await query(
      `INSERT INTO push_subscriptions (endpoint, target_role, user_id, subscription)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (endpoint) DO UPDATE SET target_role=$2, user_id=$3, subscription=$4`,
      [subscription.endpoint, role, req.user.username, JSON.stringify(subscription)]
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/unsubscribe', requireAuth, async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (endpoint) await query(`DELETE FROM push_subscriptions WHERE endpoint=$1`, [endpoint]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
