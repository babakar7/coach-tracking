const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create database directory if it doesn't exist
const dbPath = path.join(__dirname, 'coach_tracking.db');

// Initialize database
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        return;
    }
    console.log('Connected to SQLite database.');
});

// Create tables
db.serialize(() => {
    // Coaches table
    db.run(`
        CREATE TABLE IF NOT EXISTS coaches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Sessions table
    db.run(`
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            coach_id INTEGER NOT NULL,
            date TEXT NOT NULL,
            equipment TEXT NOT NULL CHECK (equipment IN ('reformer', 'mat', 'chair')),
            type TEXT NOT NULL CHECK (type IN ('practice', 'observation')),
            hours REAL NOT NULL CHECK (hours > 0),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (coach_id) REFERENCES coaches (id) ON DELETE CASCADE
        )
    `);

    // Insert default coaches
    db.run(`
        INSERT OR IGNORE INTO coaches (name) VALUES ('Soukeyna'), ('Fabacary')
    `, (err) => {
        if (err) {
            console.error('Error inserting default coaches:', err.message);
        } else {
            console.log('Default coaches created successfully.');
        }
    });

    console.log('Database tables created successfully.');
});

// Close database
db.close((err) => {
    if (err) {
        console.error('Error closing database:', err.message);
    } else {
        console.log('Database initialization completed.');
    }
});
