
import { db } from './src/db';
import { events } from './src/db/schema';

async function checkEvents() {
    const list = await db.select().from(events);
    console.log('--- EVENTOS NO BANCO ---');
    list.forEach(e => {
        console.log(`ID: ${e.id} | Título: ${e.title} | Status: ${e.status} | Categoria: ${e.category} | Featured: ${e.isFeatured}`);
    });
    process.exit(0);
}

checkEvents();
