const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Database connection
const dbPath = path.join(__dirname, 'database', 'coach_tracking.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        process.exit(1);
    }
    console.log('Connected to SQLite database.');
});

// Training objectives (hours required for each equipment and type)
const TRAINING_OBJECTIVES = {
    reformer: {
        practice: 22,
        observation: 5,
        total: 27
    },
    mat: {
        practice: 12,
        observation: 3,
        total: 15
    },
    chair: {
        practice: 12,
        observation: 3,
        total: 15
    }
};

// Routes

// Get all coaches
app.get('/api/coaches', (req, res) => {
    db.all('SELECT * FROM coaches ORDER BY name', [], (err, rows) => {
        if (err) {
            console.error('Error fetching coaches:', err.message);
            res.status(500).json({ error: 'Internal server error' });
            return;
        }
        res.json(rows);
    });
});

// Create a new coach
app.post('/api/coaches', (req, res) => {
    const { name } = req.body;
    
    if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Coach name is required' });
    }

    db.run('INSERT INTO coaches (name) VALUES (?)', [name.trim()], function(err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
                return res.status(409).json({ error: 'Coach name already exists' });
            }
            console.error('Error creating coach:', err.message);
            return res.status(500).json({ error: 'Internal server error' });
        }
        
        res.status(201).json({ 
            id: this.lastID, 
            name: name.trim(),
            message: 'Coach created successfully' 
        });
    });
});

// Get sessions for a specific coach
app.get('/api/coaches/:id/sessions', (req, res) => {
    const coachId = req.params.id;
    
    db.all(`
        SELECT s.*, c.name as coach_name 
        FROM sessions s 
        JOIN coaches c ON s.coach_id = c.id 
        WHERE s.coach_id = ? 
        ORDER BY s.date DESC, s.created_at DESC
    `, [coachId], (err, rows) => {
        if (err) {
            console.error('Error fetching sessions:', err.message);
            res.status(500).json({ error: 'Internal server error' });
            return;
        }
        res.json(rows);
    });
});

// Add a new session for a coach
app.post('/api/coaches/:id/sessions', (req, res) => {
    const coachId = req.params.id;
    const { date, equipment, type, hours } = req.body;
    
    // Validation
    if (!date || !equipment || !type || !hours) {
        return res.status(400).json({ error: 'All fields are required' });
    }
    
    if (!['reformer', 'mat', 'chair'].includes(equipment)) {
        return res.status(400).json({ error: 'Invalid equipment type' });
    }
    
    if (!['practice', 'observation'].includes(type)) {
        return res.status(400).json({ error: 'Invalid training type' });
    }
    
    if (hours <= 0 || hours > 24) {
        return res.status(400).json({ error: 'Hours must be between 0.5 and 24' });
    }

    // Check if coach exists
    db.get('SELECT id FROM coaches WHERE id = ?', [coachId], (err, coach) => {
        if (err) {
            console.error('Error checking coach:', err.message);
            return res.status(500).json({ error: 'Internal server error' });
        }
        
        if (!coach) {
            return res.status(404).json({ error: 'Coach not found' });
        }

        // Insert session
        db.run(`
            INSERT INTO sessions (coach_id, date, equipment, type, hours) 
            VALUES (?, ?, ?, ?, ?)
        `, [coachId, date, equipment, type, hours], function(err) {
            if (err) {
                console.error('Error creating session:', err.message);
                return res.status(500).json({ error: 'Internal server error' });
            }
            
            res.status(201).json({ 
                id: this.lastID,
                coach_id: coachId,
                date,
                equipment,
                type,
                hours,
                message: 'Session added successfully' 
            });
        });
    });
});

// Delete a session
app.delete('/api/sessions/:id', (req, res) => {
    const sessionId = req.params.id;
    
    db.run('DELETE FROM sessions WHERE id = ?', [sessionId], function(err) {
        if (err) {
            console.error('Error deleting session:', err.message);
            return res.status(500).json({ error: 'Internal server error' });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Session not found' });
        }
        
        res.json({ message: 'Session deleted successfully' });
    });
});

// Get progress summary for a coach
app.get('/api/coaches/:id/progress', (req, res) => {
    const coachId = req.params.id;
    
    db.all(`
        SELECT equipment, type, SUM(hours) as total_hours 
        FROM sessions 
        WHERE coach_id = ? 
        GROUP BY equipment, type
    `, [coachId], (err, rows) => {
        if (err) {
            console.error('Error fetching progress:', err.message);
            return res.status(500).json({ error: 'Internal server error' });
        }
        
        // Initialize progress structure
        const progress = {
            reformer: { practice: 0, observation: 0, total: 0 },
            mat: { practice: 0, observation: 0, total: 0 },
            chair: { practice: 0, observation: 0, total: 0 }
        };
        
        // Fill in actual hours
        rows.forEach(row => {
            if (progress[row.equipment] && progress[row.equipment][row.type] !== undefined) {
                progress[row.equipment][row.type] = row.total_hours;
            }
        });
        
        // Calculate totals and percentages
        Object.keys(progress).forEach(equipment => {
            const practiceHours = progress[equipment].practice;
            const observationHours = progress[equipment].observation;
            progress[equipment].total = practiceHours + observationHours;
            
            // Add objectives and percentages
            progress[equipment].objectives = TRAINING_OBJECTIVES[equipment];
            progress[equipment].practicePercentage = Math.min(100, (practiceHours / TRAINING_OBJECTIVES[equipment].practice) * 100);
            progress[equipment].observationPercentage = Math.min(100, (observationHours / TRAINING_OBJECTIVES[equipment].observation) * 100);
            progress[equipment].totalPercentage = Math.min(100, (progress[equipment].total / TRAINING_OBJECTIVES[equipment].total) * 100);
        });
        
        res.json(progress);
    });
});

// Clear all sessions for a coach
app.delete('/api/coaches/:id/sessions', (req, res) => {
    const coachId = req.params.id;
    
    db.run('DELETE FROM sessions WHERE coach_id = ?', [coachId], function(err) {
        if (err) {
            console.error('Error clearing sessions:', err.message);
            return res.status(500).json({ error: 'Internal server error' });
        }
        
        res.json({ 
            message: 'All sessions cleared successfully',
            deletedCount: this.changes
        });
    });
});

// Serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        database: 'Connected'
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`API endpoints available at http://localhost:${PORT}/api/`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('Shutting down server...');
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err.message);
        } else {
            console.log('Database connection closed.');
        }
        process.exit(0);
    });
});
