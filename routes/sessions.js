const express = require('express');
const { body, validationResult } = require('express-validator');
const Session = require('../models/Session');
const Coach = require('../models/Coach');

const router = express.Router();

// Middleware pour gérer les erreurs de validation
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Données invalides',
            details: errors.array()
        });
    }
    next();
};

// GET /api/coaches/:coachId/sessions - Obtenir toutes les sessions d'un coach
router.get('/coaches/:coachId/sessions', async (req, res) => {
    try {
        const { coachId } = req.params;
        
        // Vérifier si le coach existe
        const coach = await Coach.findById(coachId);
        if (!coach) {
            return res.status(404).json({ error: 'Coach non trouvé' });
        }
        
        const sessions = await Session.find({ coachId })
            .sort({ date: -1, createdAt: -1 })
            .populate('coachId', 'name')
            .select('-__v');
        
        res.json(sessions);
    } catch (error) {
        console.error('Erreur lors de la récupération des sessions:', error);
        
        if (error.name === 'CastError') {
            return res.status(400).json({ error: 'ID coach invalide' });
        }
        
        res.status(500).json({ error: 'Erreur serveur interne' });
    }
});

// POST /api/coaches/:coachId/sessions - Créer une nouvelle session
router.post('/coaches/:coachId/sessions', [
    body('date')
        .isISO8601()
        .withMessage('Date invalide')
        .custom((value) => {
            if (new Date(value) > new Date()) {
                throw new Error('La date ne peut pas être dans le futur');
            }
            return true;
        }),
    body('equipment')
        .isIn(['reformer', 'mat', 'chair'])
        .withMessage('L\'équipement doit être reformer, mat ou chair'),
    body('type')
        .isIn(['practice', 'observation'])
        .withMessage('Le type doit être practice ou observation'),
    body('hours')
        .isFloat({ min: 0.5, max: 24 })
        .withMessage('Les heures doivent être entre 0.5 et 24')
        .custom((value) => {
            if (value % 0.5 !== 0) {
                throw new Error('Les heures doivent être des multiples de 0.5');
            }
            return true;
        }),
    body('notes')
        .optional()
        .isLength({ max: 500 })
        .withMessage('Les notes ne peuvent pas dépasser 500 caractères')
], handleValidationErrors, async (req, res) => {
    try {
        const { coachId } = req.params;
        const { date, equipment, type, hours, notes } = req.body;
        
        // Vérifier si le coach existe
        const coach = await Coach.findById(coachId);
        if (!coach) {
            return res.status(404).json({ error: 'Coach non trouvé' });
        }
        
        const session = new Session({
            coachId,
            date,
            equipment,
            type,
            hours,
            notes
        });
        
        const savedSession = await session.save();
        await savedSession.populate('coachId', 'name');
        
        res.status(201).json({
            message: 'Session créée avec succès',
            session: {
                id: savedSession._id,
                coachId: savedSession.coachId._id,
                coachName: savedSession.coachId.name,
                date: savedSession.date,
                equipment: savedSession.equipment,
                type: savedSession.type,
                hours: savedSession.hours,
                notes: savedSession.notes,
                createdAt: savedSession.createdAt
            }
        });
    } catch (error) {
        console.error('Erreur lors de la création de la session:', error);
        
        if (error.name === 'CastError') {
            return res.status(400).json({ error: 'ID coach invalide' });
        }
        
        if (error.name === 'ValidationError') {
            return res.status(400).json({ 
                error: 'Données invalides', 
                details: Object.values(error.errors).map(e => e.message)
            });
        }
        
        res.status(500).json({ error: 'Erreur serveur interne' });
    }
});

// GET /api/sessions/:id - Obtenir une session spécifique
router.get('/:id', async (req, res) => {
    try {
        const session = await Session.findById(req.params.id)
            .populate('coachId', 'name')
            .select('-__v');
        
        if (!session) {
            return res.status(404).json({ error: 'Session non trouvée' });
        }
        
        res.json(session);
    } catch (error) {
        console.error('Erreur lors de la récupération de la session:', error);
        
        if (error.name === 'CastError') {
            return res.status(400).json({ error: 'ID session invalide' });
        }
        
        res.status(500).json({ error: 'Erreur serveur interne' });
    }
});

// PUT /api/sessions/:id - Mettre à jour une session
router.put('/:id', [
    body('date')
        .optional()
        .isISO8601()
        .withMessage('Date invalide')
        .custom((value) => {
            if (new Date(value) > new Date()) {
                throw new Error('La date ne peut pas être dans le futur');
            }
            return true;
        }),
    body('equipment')
        .optional()
        .isIn(['reformer', 'mat', 'chair'])
        .withMessage('L\'équipement doit être reformer, mat ou chair'),
    body('type')
        .optional()
        .isIn(['practice', 'observation'])
        .withMessage('Le type doit être practice ou observation'),
    body('hours')
        .optional()
        .isFloat({ min: 0.5, max: 24 })
        .withMessage('Les heures doivent être entre 0.5 et 24')
        .custom((value) => {
            if (value % 0.5 !== 0) {
                throw new Error('Les heures doivent être des multiples de 0.5');
            }
            return true;
        }),
    body('notes')
        .optional()
        .isLength({ max: 500 })
        .withMessage('Les notes ne peuvent pas dépasser 500 caractères')
], handleValidationErrors, async (req, res) => {
    try {
        const { date, equipment, type, hours, notes } = req.body;
        
        const session = await Session.findByIdAndUpdate(
            req.params.id,
            { date, equipment, type, hours, notes },
            { new: true, runValidators: true }
        ).populate('coachId', 'name').select('-__v');
        
        if (!session) {
            return res.status(404).json({ error: 'Session non trouvée' });
        }
        
        res.json({
            message: 'Session mise à jour avec succès',
            session
        });
    } catch (error) {
        console.error('Erreur lors de la mise à jour de la session:', error);
        
        if (error.name === 'CastError') {
            return res.status(400).json({ error: 'ID session invalide' });
        }
        
        if (error.name === 'ValidationError') {
            return res.status(400).json({ 
                error: 'Données invalides', 
                details: Object.values(error.errors).map(e => e.message)
            });
        }
        
        res.status(500).json({ error: 'Erreur serveur interne' });
    }
});

// DELETE /api/sessions/:id - Supprimer une session
router.delete('/:id', async (req, res) => {
    try {
        const session = await Session.findByIdAndDelete(req.params.id);
        
        if (!session) {
            return res.status(404).json({ error: 'Session non trouvée' });
        }
        
        res.json({ message: 'Session supprimée avec succès' });
    } catch (error) {
        console.error('Erreur lors de la suppression de la session:', error);
        
        if (error.name === 'CastError') {
            return res.status(400).json({ error: 'ID session invalide' });
        }
        
        res.status(500).json({ error: 'Erreur serveur interne' });
    }
});

// DELETE /api/coaches/:coachId/sessions - Supprimer toutes les sessions d'un coach
router.delete('/coaches/:coachId/sessions', async (req, res) => {
    try {
        const { coachId } = req.params;
        
        // Vérifier si le coach existe
        const coach = await Coach.findById(coachId);
        if (!coach) {
            return res.status(404).json({ error: 'Coach non trouvé' });
        }
        
        const result = await Session.deleteMany({ coachId });
        
        res.json({ 
            message: 'Toutes les sessions ont été supprimées avec succès',
            deletedCount: result.deletedCount
        });
    } catch (error) {
        console.error('Erreur lors de la suppression des sessions:', error);
        
        if (error.name === 'CastError') {
            return res.status(400).json({ error: 'ID coach invalide' });
        }
        
        res.status(500).json({ error: 'Erreur serveur interne' });
    }
});

module.exports = router;
