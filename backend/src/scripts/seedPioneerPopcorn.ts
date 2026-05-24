/**
 * Seed script: Populate Genesis CMS with Pioneer Popcorn template data
 *
 * Usage: npx ts-node src/scripts/seedPioneerPopcorn.ts
 *
 * Creates 4 collections (Services, Blog Posts, Teams, Products) with fields and items.
 * Idempotent — skips collections that already exist.
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import CMSCollection from '../models/CMSCollection';
import CMSField from '../models/CMSField';
import CMSItem from '../models/CMSItem';

// ─── DATA FROM WEBFLOW CSV EXPORTS ────────────────────────────────────────

const SERVICES_DATA = [
  {
    name: 'Original Kettle Korn',
    slug: 'original-kettle-korn',
    icon: 'https://cdn.prod.website-files.com/67258a1f555d164de19e1fd7/69807278e20be1c8eef111ce_make_a_popcorn_in_a_bowl_image_Nano_Banana_Pro_96661.jpg',
    color: 'white',
    'short-description': 'Our Original Kettle Corn is where it all begins. Perfectly popped with a light touch of sweetness and just the right amount of crunch, this classic flavor is simple, timeless, and impossible to stop eating. It\'s the go-to favorite for first-timers and longtime fans alike.',
    'about-this-service': '<h3> A Classic That Never Goes Out of Style</h3><p>Original Kettle Korn is where our story begins and where tradition shines the brightest. This flavor is all about balance — lightly sweet, perfectly crisp, and popped to golden perfection. Every batch delivers that unmistakable kettle corn experience: a gentle crunch followed by just enough sweetness to keep you reaching back in for more. It\'s simple, honest, and made the way kettle corn is meant to be enjoyed.</p><p>We believe that when something is done right, it doesn\'t need to be complicated. That\'s why our Original Kettle Korn focuses on quality ingredients and careful timing. The result is a flavor that feels familiar, comforting, and timeless — the kind of snack that brings people together whether you\'re sharing it at an event, enjoying it at home, or discovering it for the first time.</p><h3>Made for Every Occasion</h3><p>Original Kettle Korn is incredibly versatile, making it a favorite for all ages and occasions. It\'s perfect for family gatherings, movie nights, festivals, or simply when you\'re craving something light and satisfying. This is the flavor that first-time customers often start with — and longtime fans keep coming back to.</p><p>If you\'re looking for a dependable favorite that never disappoints, Original Kettle Korn delivers every time. It\'s not just a snack — it\'s a tradition in every bag.</p>',
    gallery: '',
    order: 1,
  },
  {
    name: 'Caramel',
    slug: 'caramel-korn',
    icon: 'https://cdn.prod.website-files.com/67258a1f555d164de19e1fd7/698071bf62ecd0c600bb1826_can_you_make_an_animated_caram_Nano_Banana_Pro_08903.jpg',
    color: 'hsla(39.02097902097901, 71.18%, 69.93%, 1.00)',
    'short-description': 'Rich, buttery, and beautifully coated, our Caramel kettle corn is a sweet treat done right. Each piece is covered in smooth caramel goodness that melts in your mouth while keeping that signature crunch. It\'s indulgent, satisfying, and always a crowd-pleaser.',
    'about-this-service': '<h3>Rich, Buttery, and Perfectly Coated</h3><p>Our Caramel Korn is a sweet indulgence crafted for those who love bold flavor and irresistible crunch. Each kernel is generously coated in smooth, buttery caramel that melts into every bite without overpowering the popcorn itself. The result is a rich, satisfying flavor that feels indulgent yet balanced.</p><p>This isn\'t rushed or mass-produced caramel — it\'s carefully made to cling perfectly to every piece, creating that signature crunch caramel lovers crave. From the aroma to the last bite, this flavor delivers a classic sweetness that feels both nostalgic and luxurious.</p><h3>A Crowd Favorite for a Reason</h3><p>Caramel Korn is a go-to choice for celebrations, gifts, and anyone with a serious sweet tooth. It\'s the kind of flavor that disappears fast at parties and leaves people asking where it came from. Whether you\'re sharing or keeping it all to yourself, it\'s a treat that feels special every time.</p><p>If you\'re looking for a popcorn flavor that\'s rich, comforting, and undeniably satisfying, Caramel Korn is the perfect pick.</p>',
    gallery: '',
    order: 2,
  },
  {
    name: 'Cherry',
    slug: 'cherry',
    icon: 'https://cdn.prod.website-files.com/67258a1f555d164de19e1fd7/698070927715017af56c5ef3_also_for_the_cherry_image_can__Nano_Banana_Pro_21787.jpg',
    color: 'white',
    'short-description': 'Sweet, bright, and full of flavor, our Cherry kettle corn delivers a fruity twist that stands out from the first bite. With its bold color and candy-like sweetness, this flavor is as fun to look at as it is to eat — a favorite for anyone who loves something a little different.',
    'about-this-service': '<h3>Sweet, Bright, and Full of Flavor</h3><p>Cherry kettle corn brings a bold burst of fruity sweetness that stands out from the first bite. With its vibrant color and candy-like flavor, this option is playful, eye-catching, and packed with personality. It\'s sweet without being overwhelming and delivers a fun twist on traditional kettle corn.</p><p>Each batch is crafted to ensure the cherry flavor is evenly distributed, giving you a consistent and satisfying taste throughout. It\'s a flavor that instantly grabs attention and leaves a lasting impression.</p><h3>Fun for All Ages</h3><p>Cherry is a favorite among kids and adults alike, making it a great choice for events, festivals, and anyone who loves fruity snacks. It\'s cheerful, nostalgic, and just plain fun to eat.</p><p>If you\'re craving something colorful and sweet with a little flair, Cherry is the flavor that brings the fun.</p>',
    gallery: 'https://cdn.prod.website-files.com/67258a1f555d164de19e1fd7/67258a1f555d164de19e1ff8_Service%20Gal%201-min.jpg; https://cdn.prod.website-files.com/67258a1f555d164de19e1fd7/67258a1f555d164de19e2060_Service%20Gal%202-min.jpg; https://cdn.prod.website-files.com/67258a1f555d164de19e1fd7/67258a1f555d164de19e2094_Service%20Gal%203-min.jpg; https://cdn.prod.website-files.com/67258a1f555d164de19e1fd7/67258a1f555d164de19e2076_Service%20Gal%204-min.jpg; https://cdn.prod.website-files.com/67258a1f555d164de19e1fd7/67258a1f555d164de19e2035_Service%20Gal%205-min.jpg; https://cdn.prod.website-files.com/67258a1f555d164de19e1fd7/67258a1f555d164de19e2014_Service%20Gal%206-min.jpg',
    order: 3,
  },
  {
    name: 'Blue Raspberry',
    slug: 'blue-raspberry',
    icon: 'https://cdn.prod.website-files.com/67258a1f555d164de19e1fd7/69807310919440ea47fb6de2_keep_this_image_but_make_the_b_Nano_Banana_Pro_80613.jpg',
    color: 'white',
    'short-description': 'Vibrant, sweet, and bursting with flavor, Blue Raspberry kettle corn is a playful take on a classic treat. Its bold taste and eye-catching color make it a hit with kids and adults alike. One handful in, and you\'ll see why it\'s a fan favorite.',
    'about-this-service': '<h3>Bold, Tangy, and Totally Fun</h3><p>Blue Raspberry is a flavor that doesn\'t shy away from making a statement. Sweet with a slight tang, this vibrant kettle corn delivers a bold taste that pops just as much as its bright blue color. It\'s playful, energetic, and perfect for anyone who enjoys a candy-inspired twist on classic popcorn.</p><p>The flavor is carefully balanced to keep it exciting without overpowering the crunch. Every handful delivers that unmistakable blue raspberry taste people know and love.</p><h3>A Fan Favorite with Personality</h3><p>This flavor is a hit at events and with anyone who loves something a little different. It\'s fun to share, fun to look at, and even more fun to eat.</p><p>Blue Raspberry is for snack lovers who want bold flavor, bright color, and a popcorn experience that stands out from the crowd.</p>',
    gallery: '',
    order: 4,
  },
  {
    name: 'Popped the Banana',
    slug: 'popped-the-banana',
    icon: 'https://cdn.prod.website-files.com/67258a1f555d164de19e1fd7/69807065bb9d4c5abd4c3949_now_can_you_make_a_ffea00_yell_Nano_Banana_Pro_90044.jpg',
    color: 'hsla(55, 100.00%, 50.00%, 1.00)',
    'short-description': 'Sweet, smooth, and totally unexpected, Popped the Banana is the flavor that keeps people coming back for "just one more handful." With a creamy banana taste and a satisfying crunch, this fan-favorite puts a fun twist on classic kettle corn. If you\'re feeling adventurous or just want something different, this is the one to grab.',
    'about-this-service': '<h3>Smooth, Sweet, and Unexpected</h3><p>Popped the Banana is one of our most unique and talked-about flavors. With a smooth, creamy banana taste layered over crisp popcorn, it offers a flavor experience that\'s both comforting and surprising. It\'s sweet without being heavy and delivers a mellow richness that keeps people coming back.</p><p>This flavor is crafted for those who love trying something new but still want that satisfying kettle corn crunch. It\'s proof that popcorn can be playful and innovative while still feeling familiar.</p><h3>For the Adventurous Snacker</h3><p>Popped the Banana is perfect for customers looking to step outside the usual flavors and discover something memorable. It\'s often the flavor people hesitate to try — then instantly fall in love with.</p><p>If you\'re feeling adventurous or just want a flavor that sparks conversation, Popped the Banana is a must-try.</p>',
    gallery: '',
    order: 5,
  },
  {
    name: 'Blue Razz+Cherry',
    slug: 'blue-razz-cherry',
    icon: 'https://cdn.prod.website-files.com/67258a1f555d164de19e1fd7/698072acce264cab6bb55675_Make_a_blue_razz_cherry_logo_i_Nano_Banana_Pro_37837.jpg',
    color: 'white',
    'short-description': 'Sweet, bold, and bursting with fruity flavor, our Blue Razz + Cherry blend is the best of both worlds. This colorful mix combines the tangy punch of blue raspberry with the smooth sweetness of cherry for a perfectly balanced, candy-like crunch. It\'s vibrant, fun, and made for anyone who can\'t choose just one favorite.',
    'about-this-service': '<h3>The Best of Both Worlds</h3><p>Blue Razz + Cherry combines two bold flavors into one vibrant, unforgettable blend. The tangy punch of blue raspberry meets the smooth sweetness of cherry, creating a perfectly balanced mix that delivers excitement in every bite. This colorful combination offers layered flavor and a dynamic taste experience.</p><p>Each batch is carefully mixed to ensure both flavors shine without overpowering one another. The result is a sweet-and-tangy harmony that keeps every handful interesting.</p><h3>A Flavor That Pops</h3><p>This blend is a favorite for customers who can\'t choose just one flavor — and don\'t want to. It\'s bright, playful, and packed with personality, making it ideal for sharing or standing out at events.</p><p>If you\'re looking for a flavor that\'s bold, colorful, and full of fun, Blue Razz + Cherry delivers twice the flavor in every bag.</p>',
    gallery: '',
    order: 6,
  },
];

const BLOGS_DATA = [
  {
    name: 'From Kernel to Kettle: Our Popcorn Process',
    slug: 'from-kernel-to-kettle',
    image: 'https://cdn.prod.website-files.com/67258a1f555d164de19e1fd7/69807dc0cf1d0d64672b3fc8_make_me_a_popcorn_kernel_image_Nano_Banana_Pro_30801.jpg',
    'blog-content': '<h1>From Kernel to Kettle: The Journey Behind Every Batch</h1><p>Great kettle corn doesn\'t start in the kettle — it starts long before the first pop is ever heard. From the moment a kernel is selected to the second it\'s poured fresh into a bag, every step in the process matters.</p><h2>Choosing the Right Kernel</h2><p>Not all popcorn kernels are created equal. Size, moisture content, and consistency all play a role in how popcorn pops and how it tastes. We carefully select kernels that are known for their ability to pop fully and evenly.</p><h2>The Moment It Hits the Kettle</h2><p>Once the kernels enter the kettle, everything moves quickly. Heat activates the kernels, pressure builds, and popping begins almost instantly. Every batch is actively stirred and closely monitored.</p><h2>Cooling and Setting the Flavor</h2><p>Once the kettle corn comes off the heat, the work isn\'t finished. Cooling is an essential step that allows the flavor and texture to settle properly.</p><h2>The Pioneer Popcorn Philosophy</h2><p>From kernel to kettle, every batch we make follows the same philosophy: respect the process, trust the craft, and never cut corners.</p>',
  },
  {
    name: 'How We Craft Every Batch of Kettle Corn',
    slug: 'how-we-craft',
    image: 'https://cdn.prod.website-files.com/67258a1f555d164de19e1fd7/69807b4e2402300f0182dadb_IMG_9048.webp',
    'blog-content': '<h1>How We Craft Every Batch of Kettle Corn</h1><p>At Pioneer Popcorn, kettle corn isn\'t just something we make — it\'s something we respect. Every batch represents years of experience, careful technique, and a genuine love for handcrafted popcorn.</p><h2>It Starts With Quality Ingredients</h2><p>Great kettle corn begins with great ingredients. We believe that when you keep things simple, quality matters even more.</p><h2>The Art of Balance</h2><p>One of the most important parts of crafting kettle corn is achieving balance. Too sweet, and it becomes overwhelming. Too salty, and it loses its signature charm.</p><h2>The Pioneer Popcorn Promise</h2><p>Every batch of kettle corn we craft carries a promise: quality ingredients, careful preparation, and outstanding flavor.</p>',
  },
  {
    name: 'Kettle Corn for Events: Why Everyone Loves It',
    slug: 'building-strong-bonds-with-your-dog',
    image: 'https://cdn.prod.website-files.com/67258a1f555d164de19e1fd7/69807c38a45816932290846e_make_me_an_animated_popcorn_im_Nano_Banana_Pro_96298.jpg',
    'blog-content': '<h1>Kettle Corn for Events: Why Everyone Loves It</h1><p>When it comes to events, food plays a bigger role than most people realize. That\'s why kettle corn for events has remained a crowd favorite year after year.</p><h2>A Snack Everyone Recognizes</h2><p>One of the biggest reasons kettle corn works so well at events is its universal appeal. Almost everyone knows it, and almost everyone enjoys it.</p><h2>The Aroma That Draws a Crowd</h2><p>Few things grab attention like the smell of freshly popped kettle corn.</p><h2>Why Kettle Corn Keeps Showing Up</h2><p>Trends come and go, but kettle corn for events continues to stand the test of time.</p>',
  },
  {
    name: 'Sweet vs. Savory: Which Kettle Corn Is Right for You?',
    slug: 'sweet-vs-savory',
    image: 'https://cdn.prod.website-files.com/67258a1f555d164de19e1fd7/69807a88acd13642ffdd1aba_IMG_0065.jpg',
    'blog-content': '<h2>Sweet vs Savory</h2><p>When you buy a bag of popcorn, would you rather have sweet or savory? Everyone\'s taste-buds are different, and that ultimately influences their decisions on what to get.</p><h2>When is Sweet too Sweet?</h2><p>When someone wants sweet popcorn it doesn\'t mean that they want something that taste like candy. Usually, you want something with a sweet aftertaste.</p>',
  },
  {
    name: 'The Secret Behind Perfect Kettle Corn Flavor',
    slug: 'the-secret-behind-perfect-kettle-corn-flavor',
    image: 'https://cdn.prod.website-files.com/67258a1f555d164de19e1fd7/69807a32fcd44ee1bb5c9934_IMG_6018.webp',
    'blog-content': '<h1>The Secret Behind Perfect Kettle Corn Flavor</h1><p>Kettle corn has a way of stopping people in their tracks. That balance of sweetness and savory crunch feels simple, but achieving it consistently is anything but accidental.</p><h2>It Starts With Quality Ingredients</h2><p>Great kettle corn doesn\'t begin in the kettle—it starts with the ingredients.</p><h2>Timing Is Everything</h2><p>One of the biggest secrets behind perfect kettle corn is timing. Even a few seconds can make the difference.</p><h2>Perfect Flavor Comes From Care</h2><p>At its core, the secret behind perfect kettle corn flavor is care.</p>',
  },
  {
    name: 'Why Small-Batch Popcorn Tastes Better',
    slug: 'why-small-batch-popcorn-tastes-better',
    image: 'https://cdn.prod.website-files.com/67258a1f555d164de19e1fd7/69807a6d18afd1aa35cc1046_IMG_7879.jpeg',
    'blog-content': '<h1>Why Small-Batch Popcorn Tastes Better</h1><p>If you\'ve ever bitten into popcorn that felt flat, stale, or overly processed, you already know that not all popcorn is created equal.</p><h2>What "Small-Batch" Really Means</h2><p>Small-batch popcorn refers to popcorn made in limited quantities rather than mass-produced at scale.</p><h2>Freshness You Can Taste</h2><p>Freshness is another major reason small-batch popcorn tastes better.</p><h2>Quality Over Quantity Always Wins</h2><p>In a world where convenience often comes before quality, small-batch popcorn stands out.</p>',
  },
];

const TEAMS_DATA = [
  {
    name: 'Peter',
    slug: 'peter',
    'profile-image': 'https://cdn.prod.website-files.com/67258a1f555d164de19e1fd7/697e87af7cb029a3970b56bd_IMG_6015.webp',
    position: 'Co-Founder',
    'short-description': 'Peter is the heart behind Korn Kernel.\nWith years of hands-on experience and a whole lot of love for what he does, Peter brings big flavor, warm smiles, and old-fashioned care to every batch of kettle corn. If you\'ve ever felt welcomed at our stand, that\'s him.',
    'long-description': '<h2><strong>Meet Peter – The Heart of Korn Kernel</strong></h2><p>Kettle Korn isn\'t just something I make — it\'s something I genuinely care about. Every batch starts with quality ingredients, attention to detail, and a commitment to doing things the right way, not the fast way.</p><p>What matters most to me, though, is the people. I love seeing families share a bag, kids light up at their first bite, and customers come back year after year because they know what to expect — consistency, kindness, and a product made with pride.</p><p>When you buy from us, you\'re not just getting kettle corn — you\'re getting something made with experience, patience, and a whole lot of heart.</p>',
    order: 2,
  },
];

const PRODUCTS_DATA = [
  {
    name: 'Original Kettle Korn',
    slug: 'original-kettle-korn',
    price: 8,
    description: 'Our classic kettle corn — light, sweet, and perfectly crunchy.',
    features: 'Light sweetness\nPerfect crunch\nSmall-batch made\nAll-natural ingredients',
  },
  {
    name: 'Original Karmel Korn',
    slug: 'original-karmel-korn',
    price: 10,
    description: 'Rich, buttery caramel coating over perfectly popped kettle corn.',
    features: 'Buttery caramel\nHandcrafted coating\nPerfect crunch\nSmall-batch made',
  },
  {
    name: 'Regular Original Kettle Korn',
    slug: 'regular-original-kettle-korn',
    price: 14,
    description: 'Our signature kettle corn in a larger size for sharing.',
    features: 'Larger portion\nPerfect for sharing\nSmall-batch made\nAll-natural ingredients',
  },
  {
    name: 'Large Karmel Korn',
    slug: 'large-karmel-korn',
    price: 16,
    description: 'A generous bag of our beloved caramel kettle corn.',
    features: 'Generous size\nButtery caramel\nPerfect for events\nSmall-batch made',
  },
];

// ─── COLLECTION FIELD DEFINITIONS ─────────────────────────────────────────

const COLLECTIONS_CONFIG = [
  {
    name: 'Services',
    slug: 'services',
    description: 'Kettle corn flavors',
    fields: [
      { name: 'Name', slug: 'name', type: 'text' as const, required: true, order: 0 },
      { name: 'Slug', slug: 'slug', type: 'slug' as const, required: true, order: 1 },
      { name: 'Icon', slug: 'icon', type: 'imageUrl' as const, order: 2 },
      { name: 'Color', slug: 'color', type: 'color' as const, order: 3 },
      { name: 'Short Description', slug: 'short-description', type: 'text' as const, order: 4 },
      { name: 'About This Service', slug: 'about-this-service', type: 'richText' as const, order: 5 },
      { name: 'Gallery', slug: 'gallery', type: 'text' as const, order: 6 },
      { name: 'Order', slug: 'order', type: 'number' as const, order: 7 },
    ],
    items: SERVICES_DATA,
  },
  {
    name: 'Blog Posts',
    slug: 'blog-posts',
    description: 'Blog articles',
    fields: [
      { name: 'Name', slug: 'name', type: 'text' as const, required: true, order: 0 },
      { name: 'Slug', slug: 'slug', type: 'slug' as const, required: true, order: 1 },
      { name: 'Image', slug: 'image', type: 'imageUrl' as const, order: 2 },
      { name: 'Blog Content', slug: 'blog-content', type: 'richText' as const, order: 3 },
    ],
    items: BLOGS_DATA,
  },
  {
    name: 'Teams',
    slug: 'teams',
    description: 'Team members',
    fields: [
      { name: 'Name', slug: 'name', type: 'text' as const, required: true, order: 0 },
      { name: 'Slug', slug: 'slug', type: 'slug' as const, required: true, order: 1 },
      { name: 'Profile Image', slug: 'profile-image', type: 'imageUrl' as const, order: 2 },
      { name: 'Position', slug: 'position', type: 'text' as const, order: 3 },
      { name: 'Short Description', slug: 'short-description', type: 'text' as const, order: 4 },
      { name: 'Long Description', slug: 'long-description', type: 'richText' as const, order: 5 },
      { name: 'Order', slug: 'order', type: 'number' as const, order: 6 },
    ],
    items: TEAMS_DATA,
  },
  {
    name: 'Products',
    slug: 'products',
    description: 'Product pricing',
    fields: [
      { name: 'Name', slug: 'name', type: 'text' as const, required: true, order: 0 },
      { name: 'Slug', slug: 'slug', type: 'slug' as const, required: true, order: 1 },
      { name: 'Price', slug: 'price', type: 'number' as const, order: 2 },
      { name: 'Description', slug: 'description', type: 'text' as const, order: 3 },
      { name: 'Features', slug: 'features', type: 'text' as const, order: 4 },
    ],
    items: PRODUCTS_DATA,
  },
];

// ─── MAIN ─────────────────────────────────────────────────────────────────

async function main() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('MONGODB_URI not set in .env');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  // Find project — accept projectId as CLI arg, or search by name
  const db = mongoose.connection.db!;
  const cliProjectId = process.argv[2];
  let projectDoc: any;
  if (cliProjectId) {
    projectDoc = await db.collection('projects').findOne({ _id: new mongoose.Types.ObjectId(cliProjectId) });
  } else {
    // Search by template path or name
    projectDoc = await db.collection('projects').findOne({
      templateBasePath: /pioneer-popcorn/i,
      deletedAt: null,
    });
    if (!projectDoc) {
      projectDoc = await db.collection('projects').findOne({
        name: { $regex: /pioneer|popcorn|korn/i },
        deletedAt: null,
      });
    }
  }
  if (!projectDoc) {
    console.error('Could not find project. Available projects:');
    const allProjects = await db.collection('projects').find({ deletedAt: null }).project({ name: 1, templateBasePath: 1 }).toArray();
    allProjects.forEach((p: any) => console.log(`  - ${p.name} (${p._id}) template: ${p.templateBasePath || '-'}`));
    process.exit(1);
  }

  console.log(`Found project: ${projectDoc.name} (${projectDoc._id})`);
  const orgId = projectDoc.orgId as mongoose.Types.ObjectId;
  const projectId = projectDoc._id as mongoose.Types.ObjectId;

  // We need a user ID for createdBy/updatedBy
  const userDoc = await db.collection('users').findOne({});
  if (!userDoc) {
    console.error('No users found in database');
    process.exit(1);
  }
  const userId = userDoc._id as mongoose.Types.ObjectId;
  console.log(`Using user: ${userId}`);

  for (const collectionConfig of COLLECTIONS_CONFIG) {
    console.log(`\n--- Processing collection: ${collectionConfig.name} ---`);

    // Check if collection already exists
    let collection = await CMSCollection.findOne({
      projectId,
      slug: collectionConfig.slug,
    });

    if (collection) {
      console.log(`  Collection "${collectionConfig.name}" already exists (${collection._id}), skipping creation`);
    } else {
      collection = await CMSCollection.create({
        orgId,
        projectId,
        name: collectionConfig.name,
        slug: collectionConfig.slug,
        description: collectionConfig.description,
        primaryField: 'name',
        createdBy: userId,
      });
      console.log(`  Created collection: ${collection._id}`);
    }

    const collectionId = collection._id as mongoose.Types.ObjectId;

    // Create fields (skip if they exist)
    for (const fieldDef of collectionConfig.fields) {
      const existing = await CMSField.findOne({
        collectionId,
        slug: fieldDef.slug,
      });
      if (existing) {
        console.log(`  Field "${fieldDef.name}" already exists, skipping`);
        continue;
      }
      await CMSField.create({
        collectionId,
        name: fieldDef.name,
        slug: fieldDef.slug,
        type: fieldDef.type,
        required: fieldDef.required || false,
        order: fieldDef.order,
      });
      console.log(`  Created field: ${fieldDef.name} (${fieldDef.type})`);
    }

    // Create items (skip if slug exists)
    for (const itemData of collectionConfig.items) {
      const existing = await CMSItem.findOne({
        collectionId,
        slug: itemData.slug,
      });
      if (existing) {
        console.log(`  Item "${itemData.name}" already exists, skipping`);
        continue;
      }

      const fieldData: Record<string, any> = {};
      for (const [key, value] of Object.entries(itemData)) {
        if (key !== 'slug') {
          fieldData[key] = value;
        }
      }

      await CMSItem.create({
        collectionId,
        orgId,
        projectId,
        slug: itemData.slug,
        status: 'published',
        publishedAt: new Date(),
        fieldData,
        createdBy: userId,
        updatedBy: userId,
      });
      console.log(`  Created item: ${itemData.name}`);
    }
  }

  console.log('\nSeed complete!');
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
