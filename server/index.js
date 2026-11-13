
import 'dotenv/config';
import dns from 'node:dns';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import cron from 'node-cron';
import slugify from 'slugify';
import sanitize from 'sanitize-html';
import path from 'node:path';
import fs from 'node:fs';
import { User, Category, Post } from './models.js';

const app = express();
const SITE = process.env.SITE_URL || 'http://localhost:5173';

app.use(cors());
app.use(express.json({ limit: '2mb' }));

fs.mkdirSync('uploads', { recursive: true });
app.use('/uploads', express.static('uploads'));

const upload = multer({
  storage: multer.diskStorage({
    destination: 'uploads',
    filename: (_, file, cb) =>
      cb(null, Date.now() + path.extname(file.originalname))
  }),
  limits: { fileSize: 5e6 },
  fileFilter: (_, file, cb) =>
    cb(null, /^image\//.test(file.mimetype))
});

const wrap = fn => (req, res) =>
  fn(req, res).catch(error =>
    res.status(500).json({ error: error.message })
  );

const auth = (req, res, next) => {
  try {
    req.user = jwt.verify(
      (req.headers.authorization || '').replace('Bearer ', ''),
      process.env.JWT_SECRET
    );
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

const clean = html =>
  sanitize(html || '', {
    allowedTags: sanitize.defaults.allowedTags.concat([
      'img', 'h1', 'h2', 'iframe', 'video', 'source'
    ]),
    allowedAttributes: {
      '*': ['class', 'id'],
      a: ['href', 'target', 'rel'],
      img: ['src', 'alt'],
      iframe: ['src', 'allowfullscreen'],
      video: ['src', 'controls'],
      source: ['src', 'type']
    },
    allowedIframeHostnames: [
      'www.youtube.com',
      'player.vimeo.com'
    ]
  });

const live = { status: 'published' };

// Health check
app.get('/api/health', (_, res) => {
  res.json({
    ok: true,
    message: 'Zoho Tech Blog API is running'
  });
});

// Authentication
app.post('/api/auth/login', wrap(async (req, res) => {
  const user = await User.findOne({ email: req.body.email });

  if (
    !user ||
    !(await bcrypt.compare(req.body.password || '', user.password))
  ) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  res.json({
    token: jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    ),
    name: user.name
  });
}));

// Categories
app.get('/api/categories', wrap(async (_, res) => {
  res.json(await Category.find().sort('name'));
}));

// Posts
app.get('/api/posts', wrap(async (req, res) => {
  const {
    q,
    category,
    featured,
    sort,
    page = 1,
    limit = 9
  } = req.query;

  const filter = { ...live };

  if (category) {
    const categoryDoc = await Category.findOne({ slug: category });
    filter.category = categoryDoc?._id;
  }

  if (featured) filter.featured = true;

  if (q) {
    const escapedQuery = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    filter.$or = [
      { title: new RegExp(escapedQuery, 'i') },
      { excerpt: new RegExp(q, 'i') },
      { tags: new RegExp(q, 'i') }
    ];
  }

  const total = await Post.countDocuments(filter);

  const posts = await Post.find(filter)
    .select('-content')
    .populate('category')
    .sort(sort === 'popular' ? '-views' : '-publishAt')
    .skip((page - 1) * limit)
    .limit(+limit);

  res.json({
    posts,
    total,
    pages: Math.ceil(total / limit)
  });
}));

app.get('/api/posts/:slug', wrap(async (req, res) => {
  const post = await Post.findOneAndUpdate(
    { slug: req.params.slug, ...live },
    { $inc: { views: 1 } },
    { new: true }
  ).populate('category');

  if (!post) {
    return res.status(404).json({ error: 'Not found' });
  }

  const [prev, next, related] = await Promise.all([
    Post.findOne({
      ...live,
      publishAt: { $lt: post.publishAt }
    }).sort('-publishAt').select('title slug'),

    Post.findOne({
      ...live,
      publishAt: { $gt: post.publishAt }
    }).sort('publishAt').select('title slug'),

    Post.find({
      ...live,
      category: post.category?._id,
      _id: { $ne: post._id }
    }).select('-content').populate('category').limit(3)
  ]);

  res.json({ post, prev, next, related });
}));

// Admin routes
const admin = express.Router();
admin.use(auth);

const prep = body => {
  const text = (body.content || '').replace(/<[^>]+>/g, ' ');

  const data = {
    ...body,
    content: clean(body.content),
    readTime: Math.max(
      1,
      Math.round(text.split(/\s+/).length / 220)
    )
  };

  data.slug = slugify(
    body.slug || body.title || '',
    { lower: true, strict: true }
  );

  if (data.status === 'published' && !data.publishAt) {
    data.publishAt = new Date();
  }

  if (data.status === 'scheduled' && !data.publishAt) {
    data.status = 'draft';
  }

  return data;
};

admin.get('/posts', wrap(async (_, res) => {
  res.json(
    await Post.find()
      .select('-content')
      .populate('category')
      .sort('-updatedAt')
  );
}));

admin.get('/posts/:id', wrap(async (req, res) => {
  res.json(await Post.findById(req.params.id));
}));

admin.post('/posts', wrap(async (req, res) => {
  res.status(201).json(await Post.create(prep(req.body)));
}));

admin.put('/posts/:id', wrap(async (req, res) => {
  res.json(
    await Post.findByIdAndUpdate(
      req.params.id,
      prep(req.body),
      { new: true }
    )
  );
}));

admin.delete('/posts/:id', wrap(async (req, res) => {
  await Post.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
}));

admin.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Image required' });
  }

  res.json({ url: `/uploads/${req.file.filename}` });
});

admin.post('/categories', wrap(async (req, res) => {
  res.status(201).json(
    await Category.create({
      name: req.body.name,
      slug: slugify(req.body.name, {
        lower: true,
        strict: true
      })
    })
  );
}));

admin.delete('/categories/:id', wrap(async (req, res) => {
  await Category.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
}));

app.use('/api/admin', admin);

// SEO
app.get('/robots.txt', (_, res) => {
  res.type('text').send(
    `User-agent: *
Allow: /
Disallow: /admin
Sitemap: ${SITE}/sitemap.xml`
  );
});

app.get('/sitemap.xml', wrap(async (_, res) => {
  const posts = await Post.find(live).select('slug updatedAt');

  const urls = posts.map(post =>
    `<url><loc>${SITE}/articles/${post.slug}</loc><lastmod>${post.updatedAt.toISOString()}</lastmod></url>`
  ).join('');

  res.type('xml').send(
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url><loc>${SITE}/</loc></url>
<url><loc>${SITE}/articles</loc></url>
${urls}
</urlset>`
  );
}));

// Scheduled publishing
cron.schedule('* * * * *', () => {
  Post.updateMany(
    {
      status: 'scheduled',
      publishAt: { $lte: new Date() }
    },
    { status: 'published' }
  ).catch(console.error);
});

// MongoDB connection
if (process.env.NODE_ENV !== 'production') {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
}

await mongoose.connect(process.env.MONGO_URI);

console.log('MongoDB connected successfully');

// Seed initial categories
if (!(await Category.countDocuments())) {
  await Category.insertMany([
    'Software Development',
    'Artificial Intelligence & Machine Learning',
    'Web and Mobile App Development',
    'Technology & Innovation',
    'Cybersecurity',
    'Cloud Computing',
    'Industry Insights'
  ].map(name => ({
    name,
    slug: slugify(name, { lower: true, strict: true })
  })));
}

// Create initial admin
if (!(await User.countDocuments())) {
  await User.create({
    name: 'Admin',
    email: process.env.ADMIN_EMAIL,
    password: await bcrypt.hash(process.env.ADMIN_PASSWORD, 10)
  });
}

// Start server
app.listen(process.env.PORT || 5000, () => {
  console.log(`API ready on port ${process.env.PORT || 5000}`);
});
