import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function seed() {
  console.log('Seeding database...');

  // Seed AI config entries
  const defaultConfigs = [
    { key: 'GROQ_API_KEY', value: '' },
    { key: 'OLLAMA_BASE_URL', value: 'http://localhost:11434' },
    { key: 'MODEL_NAME', value: '' },
    { key: 'AI_PROVIDER', value: 'BUILTIN' },
    { key: 'PAYMENT_MODE', value: 'SUBSCRIPTION' },
    { key: 'PAYFAST_MERCHANT_ID', value: '' },
    { key: 'PAYFAST_MERCHANT_KEY', value: '' },
    { key: 'PAYFAST_PASSPHRASE', value: '' },
    { key: 'PAYFAST_BASE_URL', value: 'https://sandbox.payfast.co.za' },
    { key: 'BLUEPRINT_PRICE_PER', value: '97' },
    { key: 'PAYPAL_CLIENT_ID', value: '' },
    { key: 'PAYPAL_SECRET', value: '' },
  ];

  for (const config of defaultConfigs) {
    const existing = await db.aIConfig.findUnique({
      where: { key: config.key },
    });
    if (!existing) {
      await db.aIConfig.create({ data: config });
      console.log(`  Created config: ${config.key}`);
    }
  }

  // Seed payment tiers
  const tiers = [
    {
      name: 'Free',
      slug: 'free',
      price: 0,
      maxBlueprints: 1,
      features: JSON.stringify([
        '1 blueprint per month',
        'Basic Thinkovr Verum Engine analysis',
        'Community access',
      ]),
      sortOrder: 0,
    },
    {
      name: 'Standard',
      slug: 'standard',
      price: 97,
      maxBlueprints: 10,
      features: JSON.stringify([
        '10 blueprints per month',
        'Full Thinkovr Verum Engine analysis',
        'Priority generation',
        'Email support',
      ]),
      sortOrder: 1,
    },
    {
      name: 'Premium',
      slug: 'premium',
      price: 297,
      maxBlueprints: 999,
      features: JSON.stringify([
        'Unlimited blueprints',
        'Full Thinkovr Verum Engine analysis',
        'Instant generation',
        'Priority admin review',
        'Detailed risk assessment',
        'Direct Thinkovr Verum Engine support',
      ]),
      sortOrder: 2,
    },
  ];

  for (const tier of tiers) {
    const existing = await db.paymentTier.findUnique({
      where: { slug: tier.slug },
    });
    if (!existing) {
      await db.paymentTier.create({ data: tier });
      console.log(`  Created tier: ${tier.name}`);
    }
  }

  // Seed admin user if none exists
  const adminEmail = 'admin@thinkovr.com';
  const existingAdmin = await db.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('admin123', 12);
    await db.user.create({
      data: {
        name: 'Admin',
        email: adminEmail,
        password: hashedPassword,
        role: 'ADMIN',
      },
    });
    console.log(`  Created admin user: ${adminEmail} (password: admin123)`);
  }

  // Seed staff user
  const staffEmail = 'staff@thinkovr.com';
  const existingStaff = await db.user.findUnique({
    where: { email: staffEmail },
  });

  if (!existingStaff) {
    const hashedPassword = await bcrypt.hash('staff123', 12);
    await db.user.create({
      data: {
        name: 'Staff',
        email: staffEmail,
        password: hashedPassword,
        role: 'STAFF',
      },
    });
    console.log(`  Created staff user: ${staffEmail} (password: staff123)`);
  }

  console.log('Seeding complete.');
}

// Run if called directly
seed().catch(console.error);
