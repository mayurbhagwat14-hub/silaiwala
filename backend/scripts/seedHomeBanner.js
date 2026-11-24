/**
 * Seeds the customer home-page hero banner ("Your Perfect Fit / Just a Tap Away").
 *
 *   node scripts/seedHomeBanner.js            -> dry run: shows what would change, writes nothing
 *   node scripts/seedHomeBanner.js --apply    -> uploads the photo to Cloudinary, saves the banner,
 *                                                and sets other active home banners to Inactive
 *
 * The app writes the text on top of the photo, so the photo itself must have NO text in it:
 *   badge    -> italic line   ("Your Perfect Fit")
 *   title    -> bold line     ("Just a Tap Away")
 *   subtitle -> small line    ("Online Stitching • Bridal Wear • Embroidery & More")
 *
 * Safe to re-run: the banner is matched by title + location and updated in place, never duplicated.
 * Other banners are only marked Inactive (never deleted) — re-activate them from Admin → CMS.
 */
const path = require('path');
const dns = require('dns');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });

// Same DNS setup as src/config/db.js so Atlas SRV lookups work on Windows.
if (dns.setDefaultResultOrder) dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);

const mongoose = require('mongoose');
const Banner = require('../src/models/Banner');
const cloudinary = require('../src/config/cloudinary');

const APPLY = process.argv.includes('--apply');
const HOME = 'Home Page - Top Carousel';
const PHOTO = path.join(__dirname, '..', '..', 'frontend', 'public', 'images', 'home', 'banner-perfect-fit.jpg');

const BANNER = {
  badge: 'Your Perfect Fit',
  title: 'Just a Tap Away',
  subtitle: 'Online Stitching • Bridal Wear • Embroidery & More',
  targetLocation: HOME,
  status: 'Active',
};

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log(APPLY ? 'APPLY mode — writing changes\n' : 'DRY RUN — nothing will be written (add --apply)\n');

  const existing = await Banner.findOne({ title: BANNER.title, targetLocation: HOME });
  const others = await Banner.find({ targetLocation: HOME, status: 'Active', _id: { $ne: existing?._id } })
    .select('title badge')
    .lean();

  console.log(existing ? `• Update banner "${BANNER.title}" (${existing._id})` : `• Create banner "${BANNER.title}"`);
  others.forEach((b) => console.log(`• Set Inactive: "${b.badge ? `${b.badge} / ` : ''}${b.title}" (${b._id})`));

  if (!APPLY) {
    await mongoose.disconnect();
    return;
  }

  const upload = await cloudinary.uploader.upload(PHOTO, {
    folder: 'banners',
    public_id: 'home-perfect-fit',
    overwrite: true,
  });
  console.log(`  uploaded photo → ${upload.secure_url}`);

  const saved = await Banner.findOneAndUpdate(
    { title: BANNER.title, targetLocation: HOME },
    { $set: { ...BANNER, image: upload.secure_url } },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
  );
  console.log(`  saved banner ${saved._id}`);

  if (others.length) {
    await Banner.updateMany({ _id: { $in: others.map((b) => b._id) } }, { $set: { status: 'Inactive' } });
    console.log(`  set ${others.length} other home banner(s) Inactive`);
  }

  console.log('\nDone. The public banner list is cached for up to 5 minutes.');
  await mongoose.disconnect();
};

run().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
