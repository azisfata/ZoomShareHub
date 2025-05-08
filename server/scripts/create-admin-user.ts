import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { hashPassword } from '../auth';

async function createAdminUser() {
  console.log('Checking for admin user...');
  
  // Cek apakah sudah ada user dengan role admin
  const adminUsers = await db.select().from(users).where(eq(users.role, 1));
  
  if (adminUsers.length > 0) {
    console.log('Admin user already exists:', adminUsers[0].username);
    return;
  }
  
  // Jika belum ada, buat user admin baru
  console.log('No admin user found. Creating admin user...');
  
  // Hash password untuk admin
  const hashedPassword = await hashPassword('admin123');
  
  // Data untuk user admin
  const adminUser = {
    username: 'admin',
    password: hashedPassword,
    name: 'Administrator',
    department: 'IT',
    email: 'admin@example.com',
    role: 1 // admin role
  };
  
  // Insert user admin ke database
  try {
    const result = await db.insert(users).values(adminUser);
    console.log('Admin user created successfully!');
  } catch (error) {
    console.error('Error creating admin user:', error);
  }
}

// Jalankan fungsi
createAdminUser()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
