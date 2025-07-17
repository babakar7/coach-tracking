const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path
const dbPath = path.join(__dirname, 'coach_tracking.db');

// Connect to database
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        return;
    }
    console.log('Connected to SQLite database.');
});

// Update coaches
db.serialize(() => {
    // Clear existing data
    db.run('DELETE FROM sessions', (err) => {
        if (err) {
            console.error('Error clearing sessions:', err.message);
        } else {
            console.log('Cleared existing sessions.');
        }
    });

    db.run('DELETE FROM coaches', (err) => {
        if (err) {
            console.error('Error clearing coaches:', err.message);
        } else {
            console.log('Cleared existing coaches.');
        }
    });

    // Insert new coaches
    db.run(`
        INSERT INTO coaches (name) VALUES ('Soukeyna'), ('Fabacary')
    `, (err) => {
        if (err) {
            console.error('Error inserting new coaches:', err.message);
        } else {
            console.log('New coaches Soukeyna and Fabacary added successfully.');
        }
    });

    // Verify coaches were added
    db.all('SELECT * FROM coaches', [], (err, rows) => {
        if (err) {
            console.error('Error querying coaches:', err.message);
        } else {
            console.log('Current coaches in database:');
            rows.forEach(row => {
                console.log(`ID: ${row.id}, Name: ${row.name}`);
            });
        }
    });
});

// Close database
db.close((err) => {
    if (err) {
        console.error('Error closing database:', err.message);
    } else {
        console.log('Database update completed.');
    }
});
