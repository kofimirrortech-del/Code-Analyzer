import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDb } from './db.js';
import authRouter from './routes/auth.js';
import storeRouter from './routes/store.js';
import ingredientsRouter from './routes/ingredients.js';
import productionRouter from './routes/production.js';
import packagesRouter from './routes/packages.js';
import dispatchRouter from './routes/dispatch.js';
import dashboardRouter from './routes/dashboard.js';
import historyRouter from './routes/history.js';
import gdriveRouter from './routes/gdrive.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use('/api/auth', authRouter);
app.use('/api/store', storeRouter);
app.use('/api/ingredients', ingredientsRouter);
app.use('/api/production', productionRouter);
app.use('/api/packages', packagesRouter);
app.use('/api/dispatch', dispatchRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/history', historyRouter);
app.use('/api/gdrive', gdriveRouter);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

if (isProd) {
  const distPath = path.join(__dirname, '../client/dist');
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
