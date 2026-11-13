import mongoose from 'mongoose';
const { Schema, model } = mongoose;
export const User = model('User', new Schema({ name: String, email: { type: String, unique: true }, password: String }));
export const Category = model('Category', new Schema({ name: String, slug: { type: String, unique: true } }));
export const Post = model('Post', new Schema({
  title: String, slug: { type: String, unique: true }, excerpt: String, content: String, image: String,
  author: { type: String, default: 'Editorial Team' }, category: { type: Schema.Types.ObjectId, ref: 'Category' },
  tags: [String], featured: { type: Boolean, default: false }, views: { type: Number, default: 0 },
  status: { type: String, enum: ['draft', 'scheduled', 'published'], default: 'draft' },
  publishAt: Date, seoTitle: String, seoDesc: String, readTime: Number
}, { timestamps: true }));
