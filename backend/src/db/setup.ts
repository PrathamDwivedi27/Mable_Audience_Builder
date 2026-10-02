import { pool } from './pool.js';
import { migrate } from './migrate.js';
import { seed } from './seed.js';

// Run with: npm run db:setup
// Creates the table and loads the seed data.
async function main() {
    try {
        await migrate();
        const count = await seed();
        console.log(`Database ready: ${count} seed events inserted`);
    } catch (error) {
        console.error('Database setup failed:', error);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
}

main();
