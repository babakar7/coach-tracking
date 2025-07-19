const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Import des routes
const coachesRoutes = require('./routes/coaches');
const sessionsRoutes = require('./routes/sessions');

// Import des modèles pour l'initialisation
const Coach = require('./models/Coach');
const { seedCoaches } = require('./utils/seed');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir les fichiers statiques
app.use(express.static(path.join(__dirname, 'public')));

// Configuration MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/coach_tracking';

// Fonction pour se connecter à MongoDB
async function connectToDatabase() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connecté à MongoDB');
        
        // Initialiser les coaches par défaut
        await initializeDefaultCoaches();
        
    } catch (error) {
        console.error('❌ Erreur de connexion à MongoDB:', error.message);
        process.exit(1);
    }
}

// Fonction pour initialiser les coaches par défaut
async function initializeDefaultCoaches() {
    try {
        const existingCoaches = await Coach.find();
        
        if (existingCoaches.length === 0) {
            console.log('🌱 Création des coaches par défaut...');
            await seedCoaches();
        } else {
            console.log(`📋 ${existingCoaches.length} coaches trouvés dans la base`);
        }
    } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation des coaches:', error.message);
    }
}

// Routes API
app.use('/api/coaches', coachesRoutes);
app.use('/api/sessions', sessionsRoutes);

// Route pour compatibilité avec l'ancien frontend
app.get('/api/coaches/:id/sessions', async (req, res) => {
    try {
        const Session = require('./models/Session');
        const Coach = require('./models/Coach');
        
        const coachId = req.params.id;
        
        // Validate coach ID
        if (!coachId || coachId === 'undefined' || coachId === 'null') {
            return res.status(400).json({ error: 'ID coach invalide ou manquant' });
        }
        
        const coach = await Coach.findById(coachId);
        if (!coach) {
            return res.status(404).json({ error: 'Coach non trouvé' });
        }
        
        const sessions = await Session.find({ coachId: coachId })
            .sort({ date: -1, createdAt: -1 })
            .lean();
        
        // Formater les sessions pour l'ancien frontend
        const formattedSessions = sessions.map(session => ({
            id: session._id,
            coach_id: session.coachId,
            date: session.date.toISOString().split('T')[0],
            equipment: session.equipment,
            type: session.type,
            hours: session.hours,
            notes: session.notes,
            created_at: session.createdAt
        }));
        
        res.json(formattedSessions);
    } catch (error) {
        console.error('Erreur lors de la récupération des sessions:', error);
        
        if (error.name === 'CastError') {
            return res.status(400).json({ error: 'ID coach invalide' });
        }
        
        res.status(500).json({ error: 'Erreur serveur interne' });
    }
});

// Route pour ajouter une session (compatibilité frontend)
app.post('/api/coaches/:id/sessions', async (req, res) => {
    try {
        const Session = require('./models/Session');
        const Coach = require('./models/Coach');
        
        const coach = await Coach.findById(req.params.id);
        if (!coach) {
            return res.status(404).json({ error: 'Coach non trouvé' });
        }
        
        const { date, equipment, type, hours } = req.body;
        
        const session = new Session({
            coachId: req.params.id,
            date: new Date(date),
            equipment,
            type,
            hours: parseFloat(hours)
        });
        
        const savedSession = await session.save();
        
        res.status(201).json({
            id: savedSession._id,
            coach_id: savedSession.coachId,
            date: savedSession.date.toISOString().split('T')[0],
            equipment: savedSession.equipment,
            type: savedSession.type,
            hours: savedSession.hours,
            message: 'Session ajoutée avec succès'
        });
    } catch (error) {
        console.error('Erreur lors de la création de la session:', error);
        res.status(500).json({ error: 'Erreur serveur interne' });
    }
});

// Route pour supprimer une session (compatibilité frontend)
app.delete('/api/sessions/:id', async (req, res) => {
    try {
        const Session = require('./models/Session');
        
        const session = await Session.findByIdAndDelete(req.params.id);
        
        if (!session) {
            return res.status(404).json({ error: 'Session non trouvée' });
        }
        
        res.json({ message: 'Session supprimée avec succès' });
    } catch (error) {
        console.error('Erreur lors de la suppression de la session:', error);
        res.status(500).json({ error: 'Erreur serveur interne' });
    }
});

// Route pour les progrès d'un coach (compatibilité frontend)
app.get('/api/coaches/:id/progress', async (req, res) => {
    try {
        const Session = require('./models/Session');
        const Coach = require('./models/Coach');
        
        const coach = await Coach.findById(req.params.id);
        if (!coach) {
            return res.status(404).json({ error: 'Coach non trouvé' });
        }
        
        const progress = await Session.getCoachProgress(req.params.id);
        res.json(progress);
    } catch (error) {
        console.error('Erreur lors de la récupération des progrès:', error);
        res.status(500).json({ error: 'Erreur serveur interne' });
    }
});

// Route pour supprimer toutes les sessions d'un coach (compatibilité frontend)
app.delete('/api/coaches/:id/sessions', async (req, res) => {
    try {
        const Session = require('./models/Session');
        const Coach = require('./models/Coach');
        
        const coach = await Coach.findById(req.params.id);
        if (!coach) {
            return res.status(404).json({ error: 'Coach non trouvé' });
        }
        
        const result = await Session.deleteMany({ coachId: req.params.id });
        
        res.json({
            message: 'Toutes les sessions ont été supprimées avec succès',
            deletedCount: result.deletedCount
        });
    } catch (error) {
        console.error('Erreur lors de la suppression des sessions:', error);
        res.status(500).json({ error: 'Erreur serveur interne' });
    }
});

// Route pour obtenir tous les coaches (compatibilité frontend)
app.get('/api/coaches', async (req, res) => {
    try {
        const Coach = require('./models/Coach');
        
        const coaches = await Coach.find({ isActive: true })
            .sort({ name: 1 })
            .lean();
        
        // Formater pour l'ancien frontend
        const formattedCoaches = coaches.map(coach => ({
            id: coach._id,
            name: coach.name,
            email: coach.email,
            phone: coach.phone,
            created_at: coach.createdAt
        }));
        
        res.json(formattedCoaches);
    } catch (error) {
        console.error('Erreur lors de la récupération des coaches:', error);
        res.status(500).json({ error: 'Erreur serveur interne' });
    }
});

// Route principale
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Route de santé
app.get('/api/health', async (req, res) => {
    try {
        const Coach = require('./models/Coach');
        const Session = require('./models/Session');
        
        const coachCount = await Coach.countDocuments();
        const sessionCount = await Session.countDocuments();
        
        res.json({
            status: 'OK',
            timestamp: new Date().toISOString(),
            database: 'MongoDB - Connected',
            stats: {
                coaches: coachCount,
                sessions: sessionCount
            }
        });
    } catch (error) {
        res.status(500).json({
            status: 'ERROR',
            timestamp: new Date().toISOString(),
            database: 'MongoDB - Error',
            error: error.message
        });
    }
});

// Middleware de gestion des erreurs
app.use((err, req, res, next) => {
    console.error('Erreur non gérée:', err.stack);
    res.status(500).json({ error: 'Erreur serveur interne' });
});

// Gestionnaire 404
app.use((req, res) => {
    res.status(404).json({ error: 'Route non trouvée' });
});

// Démarrer le serveur
app.listen(PORT, async () => {
    console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
    console.log(`📊 API disponible sur http://localhost:${PORT}/api/`);
    console.log(`🏠 Interface sur http://localhost:${PORT}/`);
    
    // Se connecter à MongoDB
    await connectToDatabase();
});

// Gestion gracieuse de l'arrêt
process.on('SIGINT', async () => {
    console.log('\n🛑 Arrêt du serveur...');
    try {
        await mongoose.connection.close();
        console.log('🔌 Connexion MongoDB fermée');
        process.exit(0);
    } catch (err) {
        console.error('❌ Erreur lors de la fermeture:', err.message);
        process.exit(1);
    }
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Signal SIGTERM reçu, arrêt du serveur...');
    try {
        await mongoose.connection.close();
        console.log('🔌 Connexion MongoDB fermée');
        process.exit(0);
    } catch (err) {
        console.error('❌ Erreur lors de la fermeture:', err.message);
        process.exit(1);
    }
});
