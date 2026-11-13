import 'dotenv/config';
import express from 'express'; import cors from 'cors'; import mongoose from 'mongoose';
import jwt from 'jsonwebtoken'; import bcrypt from 'bcryptjs'; import multer from 'multer';
import cron from 'node-cron'; import slugify from 'slugify'; import sanitize from 'sanitize-html'; import path from 'path'; import fs from 'fs';
import { User, Category, Post } from './models.js';

const app = express(); const SITE = process.env.SITE_URL || 'http://localhost:5173';
app.use(cors()); app.use(express.json({ limit: '2mb' }));
fs.mkdirSync('uploads', { recursive: true }); app.use('/uploads', express.static('uploads'));
const upload = multer({ storage: multer.diskStorage({ destination: 'uploads', filename: (_, f, cb) => cb(null, Date.now() + path.extname(f.originalname)) }), limits: { fileSize: 5e6 }, fileFilter: (_, f, cb) => cb(null, /^image\//.test(f.mimetype)) });
const wrap = fn => (req, res) => fn(req, res).catch(e => res.status(500).json({ error: e.message }));
const auth = (req, res, next) => { try { req.user = jwt.verify((req.headers.authorization || '').replace('Bearer ', ''), process.env.JWT_SECRET); next(); } catch { res.status(401).json({ error: 'Unauthorized' }); } };
const clean = html => sanitize(html || '', { allowedTags: sanitize.defaults.allowedTags.concat(['img', 'h1', 'h2', 'iframe', 'video', 'source']), allowedAttributes: { '*': ['class', 'id'], a: ['href', 'target', 'rel'], img: ['src', 'alt'], iframe: ['src', 'allowfullscreen'], video: ['src', 'controls'], source: ['src', 'type'] }, allowedIframeHostnames: ['www.youtube.com', 'player.vimeo.com'] });
const live = { status: 'published' };

app.post('/api/auth/login', wrap(async (req, res) => {
  const u = await User.findOne({ email: req.body.email });
  if (!u || !(await bcrypt.compare(req.body.password || '', u.password))) return res.status(401).json({ error: 'Invalid credentials' });
  res.json({ token: jwt.sign({ id: u._id }, process.env.JWT_SECRET, { expiresIn: '7d' }), name: u.name });
}));

app.get('/api/categories', wrap(async (_, res) => res.json(await Category.find().sort('name'))));
app.get('/api/posts', wrap(async (req, res) => {
  const { q, category, featured, sort, page = 1, limit = 9 } = req.query; const f = { ...live };
  if (category) { const c = await Category.findOne({ slug: category }); f.category = c?._id; }
  if (featured) f.featured = true;
  if (q) f.$or = [{ title: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }, { excerpt: new RegExp(q, 'i') }, { tags: new RegExp(q, 'i') }];
  const total = await Post.countDocuments(f);
  const posts = await Post.find(f).select('-content').populate('category').sort(sort === 'popular' ? '-views' : '-publishAt').skip((page - 1) * limit).limit(+limit);
  res.json({ posts, total, pages: Math.ceil(total / limit) });
}));
app.get('/api/posts/:slug', wrap(async (req, res) => {
  const p = await Post.findOneAndUpdate({ slug: req.params.slug, ...live }, { $inc: { views: 1 } }, { new: true }).populate('category');
  if (!p) return res.status(404).json({ error: 'Not found' });
  const [prev, next, related] = await Promise.all([
    Post.findOne({ ...live, publishAt: { $lt: p.publishAt } }).sort('-publishAt').select('title slug'),
    Post.findOne({ ...live, publishAt: { $gt: p.publishAt } }).sort('publishAt').select('title slug'),
    Post.find({ ...live, category: p.category?._id, _id: { $ne: p._id } }).select('-content').populate('category').limit(3)]);
  res.json({ post: p, prev, next, related });
}));

// Admin
const a = express.Router(); a.use(auth);
const prep = b => {
  const text = (b.content || '').replace(/<[^>]+>/g, ' '); const d = { ...b, content: clean(b.content), readTime: Math.max(1, Math.round(text.split(/\s+/).length / 220)) };
  d.slug = slugify(b.slug || b.title || '', { lower: true, strict: true });
  if (d.status === 'published' && !d.publishAt) d.publishAt = new Date();
  if (d.status === 'scheduled' && !d.publishAt) d.status = 'draft';
  return d;
};
a.get('/posts', wrap(async (_, res) => res.json(await Post.find().select('-content').populate('category').sort('-updatedAt'))));
a.get('/posts/:id', wrap(async (req, res) => res.json(await Post.findById(req.params.id))));
a.post('/posts', wrap(async (req, res) => res.status(201).json(await Post.create(prep(req.body)))));
a.put('/posts/:id', wrap(async (req, res) => res.json(await Post.findByIdAndUpdate(req.params.id, prep(req.body), { new: true }))));
a.delete('/posts/:id', wrap(async (req, res) => { await Post.findByIdAndDelete(req.params.id); res.json({ ok: true }); }));
a.post('/upload', upload.single('file'), (req, res) => req.file ? res.json({ url: `/uploads/${req.file.filename}` }) : res.status(400).json({ error: 'Image required' }));
a.post('/categories', wrap(async (req, res) => res.status(201).json(await Category.create({ name: req.body.name, slug: slugify(req.body.name, { lower: true, strict: true }) }))));
a.delete('/categories/:id', wrap(async (req, res) => { await Category.findByIdAndDelete(req.params.id); res.json({ ok: true }); }));
app.use('/api/admin', a);

// SEO
app.get('/robots.txt', (_, res) => res.type('text').send(`User-agent: *\nAllow: /\nDisallow: /admin\nSitemap: ${SITE}/sitemap.xml`));
app.get('/sitemap.xml', wrap(async (_, res) => {
  const posts = await Post.find(live).select('slug updatedAt');
  res.type('xml').send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${SITE}/</loc></url><url><loc>${SITE}/articles</loc></url>${posts.map(p => `<url><loc>${SITE}/articles/${p.slug}</loc><lastmod>${p.updatedAt.toISOString()}</lastmod></url>`).join('')}</urlset>`);
}));

// Scheduled publishing
cron.schedule('* * * * *', () => Post.updateMany({ status: 'scheduled', publishAt: { $lte: new Date() } }, { status: 'published' }).catch(console.error));

await mongoose.connect(process.env.MONGO_URI);
if (!(await Category.countDocuments())) await Category.insertMany(['Software Development', 'Artificial Intelligence & Machine Learning', 'Web and Mobile App Development', 'Technology & Innovation', 'Cybersecurity', 'Cloud Computing', 'Industry Insights'].map(name => ({ name, slug: slugify(name, { lower: true, strict: true }) })));
if (!(await User.countDocuments())) await User.create({ name: 'Admin', email: process.env.ADMIN_EMAIL, password: await bcrypt.hash(process.env.ADMIN_PASSWORD, 10) });
app.listen(process.env.PORT || 5000, () => console.log('API ready'));
