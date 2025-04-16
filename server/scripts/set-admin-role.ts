import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function main() {
  try {
    const result = await db.update(users)
      .set({ role: 'admin' })
      .where(eq(users.username, 'admin'))
      .returning();
    if (result.length === 0) {
      console.log('User dengan username "admin" tidak ditemukan.');
    } else {
      console.log('Role user "admin" berhasil diubah menjadi admin.');
    }
  } catch (err) {
    console.error('Gagal update role:', err);
  } finally {
    process.exit();
  }
}

main();
