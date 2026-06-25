import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import connectDB     from './config/db';
import authRoutes    from './routes/auth';
import memberRoutes  from './routes/member';
import messageRoutes from './routes/messages';
import adminRoutes   from './routes/admin';

const app  = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== 'production') app.use(morgan('dev'));

app.use('/api/',      rateLimit({ windowMs: 15*60*1000, max: 100, standardHeaders: true, legacyHeaders: false }));
app.use('/api/auth/', rateLimit({ windowMs: 15*60*1000, max: 10,  standardHeaders: true, legacyHeaders: false }));

app.use('/api/auth',     authRoutes);
app.use('/api',          memberRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/admin',    adminRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'GreenRoots ONG API', version: '1.0.0' }));

app.use((_req, res) => res.status(404).json({ success: false, message: 'Route not found' }));
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: err.message || 'Internal server error' });
});

connectDB().then(() => {
  app.listen(PORT, () => console.log(`✅ GreenRoots API running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`));
});

export default app;
