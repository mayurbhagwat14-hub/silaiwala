/**
 * Seeds the customer-facing service categories ("What would you like stitched?" on the app home)
 * with real photos.
 *
 *   node scripts/seedServiceCategories.js            -> dry run: shows what would change, writes nothing
 *   node scripts/seedServiceCategories.js --apply    -> uploads photos to Cloudinary and saves categories
 *
 * Safe to re-run: existing categories (matched by name, case-insensitive) are never duplicated or
 * overwritten — an existing one only gets a photo if it has none.
 */
const path = require('path');
const dns = require('dns');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });

// Same DNS setup as src/config/db.js so Atlas SRV lookups work on Windows.
if (dns.setDefaultResultOrder) dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);

const mongoose = require('mongoose');
const Category = require('../src/models/Category');
const cloudinary = require('../src/config/cloudinary');

const APPLY = process.argv.includes('--apply');
const PHOTO_DIR = path.join(__dirname, '..', '..', 'frontend', 'public', 'landing');

const CATEGORIES = [
  {
    name: 'Lehenga',
    description: 'Custom lehenga cholis with blouse and dupatta finishing.',
    gender: 'women',
    photo: 'opt/womens-wear.jpg',
  },
  {
    name: 'Bridal Wear',
    description: 'Bridal lehengas and wedding outfits, made to measure.',
    gender: 'women',
    photo: 'opt/bridal-wear.jpg',
  },
  {
    name: 'Gowns',
    description: 'Evening, party and wedding gowns stitched to fit.',
    gender: 'women',
    photo: 'service_bridal_1779536675225.png',
  },
  {
    name: 'Sherwani & Bandhgala',
    description: 'Sherwanis, bandhgalas and Jodhpuri jackets for every occasion.',
    gender: 'men',
    photo: 'category_mens_wear.png',
  },
  {
    name: 'Suits & Blazers',
    description: 'Two-piece and three-piece suits, blazers and waistcoats.',
    gender: 'men',
    photo: 'service_suit_1779536603895.png',
  },
  {
    name: 'Kids Wear',
    description: 'Festive and everyday outfits for kids.',
    gender: 'kids',
    photo: 'opt/kids-wear.jpg',
  },
];

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const uploadPhoto = async (file, name) => {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const res = await cloudinary.uploader.upload(path.join(PHOTO_DIR, file), {
    folder: 'tailor_platform/categories',
    public_id: slug,
    overwrite: true,
    transformation: [{ width: 600, height: 600, crop: 'fill', gravity: 'auto', quality: 'auto', fetch_format: 'auto' }],
  });
  return res.secure_url;
};

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log(`Connected. Mode: ${APPLY ? 'APPLY (writing changes)' : 'DRY RUN (no changes)'}\n`);

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const item of CATEGORIES) {
    const existing = await Category.findOne({ name: new RegExp(`^${escapeRegex(item.name)}$`, 'i') });

    if (existing && existing.image) {
      console.log(`- skip    "${existing.name}" (already exists with a photo)`);
      skipped += 1;
      continue;
    }

    if (!APPLY) {
      console.log(existing ? `- update  "${existing.name}" (add photo)` : `- create  "${item.name}" [${item.gender}]`);
      continue;
    }

    const image = await uploadPhoto(item.photo, item.name);
    if (existing) {
      existing.image = image;
      await existing.save();
      console.log(`- updated "${existing.name}" (photo added)`);
      updated += 1;
    } else {
      await Category.create({
        name: item.name,
        description: item.description,
        gender: item.gender,
        type: 'service',
        isActive: true,
        image,
      });
      console.log(`- created "${item.name}"`);
      created += 1;
    }
  }

  console.log(`\nDone. created=${created} updated=${updated} skipped=${skipped}`);
  if (!APPLY) console.log('Nothing was written. Re-run with --apply to make these changes.');
  await mongoose.disconnect();
})().catch(async (err) => {
  console.error('Seed failed:', err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
