import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function main() {
  try {
    const result = await db.select().from(users).where(eq(users.username, 'admin'));
    if (result.length === 0) {
      console.log('User dengan username "admin" tidak ditemukan.');
    } else {
      const user = result[0];
      console.log(`Username: ${user.username}\nRole: ${user.role}`);
      if (user.role === 'admin') {
        console.log('✅ User sudah memiliki role admin.');
      } else {
        console.log('❌ User belum memiliki role admin.');
      }
    }
  } catch (err) {
    console.error('Gagal cek role:', err);
  } finally {
    process.exit();
  }
}

main();
