const { Pool } = require('pg');
require('dotenv').config();

// Configuration de la connexion PostgreSQL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test de connexion
pool.on('connect', () => {
    console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

// Fonction pour initialiser les tables
async function initializeTables() {
    const client = await pool.connect();
    
    try {
        // Créer les tables
        await client.query(`
            CREATE TABLE IF NOT EXISTS coaches (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS sessions (
                id SERIAL PRIMARY KEY,
                coach_id INTEGER NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
                date DATE NOT NULL,
                equipment VARCHAR(50) NOT NULL CHECK (equipment IN ('reformer', 'mat', 'chair')),
                type VARCHAR(50) NOT NULL CHECK (type IN ('practice', 'observation')),
                hours DECIMAL(4,2) NOT NULL CHECK (hours > 0),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Insérer les coachs par défaut s'ils n'existent pas
        await client.query(`
            INSERT INTO coaches (name) VALUES ('Soukeyna'), ('Fabacary')
            ON CONFLICT (name) DO NOTHING
        `);

        console.log('Database tables initialized successfully');
    } catch (err) {
        console.error('Error initializing tables:', err);
        throw err;
    } finally {
        client.release();
    }
}

// Fonction pour exécuter des requêtes
async function query(text, params) {
    const client = await pool.connect();
    try {
        const result = await client.query(text, params);
        return result;
    } catch (err) {
        console.error('Database query error:', err);
        throw err;
    } finally {
        client.release();
    }
}

// Fonction pour fermer la connexion
async function closePool() {
    await pool.end();
    console.log('Database connection closed');
}

module.exports = {
    query,
    initializeTables,
    closePool,
    pool
};
