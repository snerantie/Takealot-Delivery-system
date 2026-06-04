import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const SALT_ROUNDS = 12;

async function main() {
  console.log('🌱 Seeding database...');

  const adminPassword = await bcrypt.hash('Admin123!', SALT_ROUNDS);
  const driverPassword = await bcrypt.hash('Driver123!', SALT_ROUNDS);

  // --- Admin user ---
  const admin = await prisma.user.upsert({
    where: { email: 'admin@takealot-delivery.com' },
    update: {},
    create: {
      email: 'admin@takealot-delivery.com',
      passwordHash: adminPassword,
      role: 'super_admin',
      firstName: 'System',
      lastName: 'Admin',
      phoneNumber: '0110000000',
      emailVerified: true,
    },
  });
  console.log(`✅ Admin: ${admin.email} (password: Admin123!)`);


  // --- Sample driver ---
  const driverUser = await prisma.user.upsert({
    where: { email: 'driver@takealot-delivery.com' },
    update: {},
    create: {
      email: 'driver@takealot-delivery.com',
      passwordHash: driverPassword,
      role: 'driver',
      firstName: 'Thabo',
      lastName: 'Mokoena',
      phoneNumber: '0712345678',
      emailVerified: true,
      driver: {
        create: {
          driverCode: 'DRV-DEMO01',
          vehicleType: 'bike',
          licenseNumber: 'GP-123456',
          vehicleRegNumber: 'CA123456',
          bankName: 'FNB',
          bankAccountNumber: '62000000000',
          status: 'active',
        },
      },
    },
  });
  console.log(`✅ Driver: ${driverUser.email} (password: Driver123!)`);

  // --- System settings ---
  const settings: Array<{ key: string; value: string; dataType: string; description: string }> = [
    { key: 'base_delivery_fee', value: '50.00', dataType: 'number', description: 'Base fee per delivery (ZAR)' },
    { key: 'per_km_rate', value: '8.50', dataType: 'number', description: 'Rate per kilometer (ZAR)' },
    { key: 'cod_handling_fee_percent', value: '2.5', dataType: 'number', description: 'COD handling fee %' },
    { key: 'payment_cycle_days', value: '7', dataType: 'number', description: 'Payment cycle in days' },
  ];

  for (const s of settings) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: {},
      create: s,
    });
  }
  console.log(`✅ Seeded ${settings.length} system settings`);

  console.log('🌱 Seeding complete.');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
