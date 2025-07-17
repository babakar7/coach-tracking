const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

const db = require('./database/postgres');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Initialize database tables on startup
async function initializeDatabase() {
    try {
        await db.initializeTables();
        console.log('Database initialized successfully');
    } catch (error) {
        console.error('Failed to initialize database:', error);
        process.exit(1);
    }
}

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
app.get('/api/coaches', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM coaches ORDER BY name');
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching coaches:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create a new coach
app.post('/api/coaches', async (req, res) => {
    const { name } = req.body;
    
    if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Coach name is required' });
    }

    try {
        const result = await db.query('INSERT INTO coaches (name) VALUES ($1) RETURNING *', [name.trim()]);
        res.status(201).json({ 
            id: result.rows[0].id, 
            name: result.rows[0].name,
            message: 'Coach created successfully' 
        });
    } catch (err) {
        if (err.code === '23505') { // PostgreSQL unique constraint violation
            return res.status(409).json({ error: 'Coach name already exists' });
        }
        console.error('Error creating coach:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get sessions for a specific coach
app.get('/api/coaches/:id/sessions', async (req, res) => {
    const coachId = req.params.id;
    
    try {
        const result = await db.query(`
            SELECT s.*, c.name as coach_name 
            FROM sessions s 
            JOIN coaches c ON s.coach_id = c.id 
            WHERE s.coach_id = $1 
            ORDER BY s.date DESC, s.created_at DESC
        `, [coachId]);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching sessions:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Add a new session for a coach
app.post('/api/coaches/:id/sessions', async (req, res) => {
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

    try {
        // Check if coach exists
        const coachResult = await db.query('SELECT id FROM coaches WHERE id = $1', [coachId]);
        
        if (coachResult.rows.length === 0) {
            return res.status(404).json({ error: 'Coach not found' });
        }

        // Insert session
        const sessionResult = await db.query(`
            INSERT INTO sessions (coach_id, date, equipment, type, hours) 
            VALUES ($1, $2, $3, $4, $5) 
            RETURNING *
        `, [coachId, date, equipment, type, hours]);
        
        res.status(201).json({ 
            id: sessionResult.rows[0].id,
            coach_id: coachId,
            date,
            equipment,
            type,
            hours,
            message: 'Session added successfully' 
        });
    } catch (err) {
        console.error('Error creating session:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete a session
app.delete('/api/sessions/:id', async (req, res) => {
    const sessionId = req.params.id;
    
    try {
        const result = await db.query('DELETE FROM sessions WHERE id = $1', [sessionId]);
        
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Session not found' });
        }
        
        res.json({ message: 'Session deleted successfully' });
    } catch (err) {
        console.error('Error deleting session:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get progress summary for a coach
app.get('/api/coaches/:id/progress', async (req, res) => {
    const coachId = req.params.id;
    
    try {
        const result = await db.query(`
            SELECT equipment, type, SUM(hours) as total_hours 
            FROM sessions 
            WHERE coach_id = $1 
            GROUP BY equipment, type
        `, [coachId]);
        
        // Initialize progress structure
        const progress = {
            reformer: { practice: 0, observation: 0, total: 0 },
            mat: { practice: 0, observation: 0, total: 0 },
            chair: { practice: 0, observation: 0, total: 0 }
        };
        
        // Fill in actual hours
        result.rows.forEach(row => {
            if (progress[row.equipment] && progress[row.equipment][row.type] !== undefined) {
                progress[row.equipment][row.type] = parseFloat(row.total_hours);
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
    } catch (err) {
        console.error('Error fetching progress:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Clear all sessions for a coach
app.delete('/api/coaches/:id/sessions', async (req, res) => {
    const coachId = req.params.id;
    
    try {
        const result = await db.query('DELETE FROM sessions WHERE coach_id = $1', [coachId]);
        
        res.json({ 
            message: 'All sessions cleared successfully',
            deletedCount: result.rowCount
        });
    } catch (err) {
        console.error('Error clearing sessions:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
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
app.listen(PORT, async () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`API endpoints available at http://localhost:${PORT}/api/`);
    
    // Initialize database
    await initializeDatabase();
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down server...');
    try {
        await db.closePool();
        console.log('Database connection closed.');
        process.exit(0);
    } catch (err) {
        console.error('Error closing database:', err.message);
        process.exit(1);
    }
});
