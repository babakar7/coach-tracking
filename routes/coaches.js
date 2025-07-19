const express = require('express');
const { body, validationResult } = require('express-validator');
const Coach = require('../models/Coach');
const Session = require('../models/Session');

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

// GET /api/coaches - Obtenir tous les coachs
router.get('/', async (req, res) => {
    try {
        const coaches = await Coach.find({ isActive: true })
            .sort({ name: 1 })
            .lean();
        
        // Formater pour la compatibilité frontend
        const formattedCoaches = coaches.map(coach => ({
            id: coach._id,
            name: coach.name,
            email: coach.email,
            phone: coach.phone,
            created_at: coach.createdAt
        }));
        
        res.json(formattedCoaches);
    } catch (error) {
        console.error('Erreur lors de la récupération des coachs:', error);
        res.status(500).json({ error: 'Erreur serveur interne' });
    }
});

// GET /api/coaches/:id - Obtenir un coach spécifique
router.get('/:id', async (req, res) => {
    try {
        const coach = await Coach.findById(req.params.id).select('-__v');
        
        if (!coach) {
            return res.status(404).json({ error: 'Coach non trouvé' });
        }
        
        res.json(coach);
    } catch (error) {
        console.error('Erreur lors de la récupération du coach:', error);
        if (error.name === 'CastError') {
            return res.status(400).json({ error: 'ID coach invalide' });
        }
        res.status(500).json({ error: 'Erreur serveur interne' });
    }
});

// POST /api/coaches - Créer un nouveau coach
router.post('/', [
    body('name')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Le nom doit contenir entre 2 et 50 caractères'),
    body('email')
        .optional()
        .isEmail()
        .withMessage('Email invalide'),
    body('phone')
        .optional()
        .isMobilePhone()
        .withMessage('Numéro de téléphone invalide')
], handleValidationErrors, async (req, res) => {
    try {
        const { name, email, phone } = req.body;
        
        const coach = new Coach({
            name,
            email,
            phone
        });
        
        const savedCoach = await coach.save();
        
        res.status(201).json({
            message: 'Coach créé avec succès',
            coach: {
                id: savedCoach._id,
                name: savedCoach.name,
                email: savedCoach.email,
                phone: savedCoach.phone,
                createdAt: savedCoach.createdAt
            }
        });
    } catch (error) {
        console.error('Erreur lors de la création du coach:', error);
        
        if (error.code === 11000) {
            return res.status(409).json({ error: 'Un coach avec ce nom existe déjà' });
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

// PUT /api/coaches/:id - Mettre à jour un coach
router.put('/:id', [
    body('name')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Le nom doit contenir entre 2 et 50 caractères'),
    body('email')
        .optional()
        .isEmail()
        .withMessage('Email invalide'),
    body('phone')
        .optional()
        .isMobilePhone()
        .withMessage('Numéro de téléphone invalide')
], handleValidationErrors, async (req, res) => {
    try {
        const { name, email, phone } = req.body;
        
        const coach = await Coach.findByIdAndUpdate(
            req.params.id,
            { name, email, phone },
            { new: true, runValidators: true }
        ).select('-__v');
        
        if (!coach) {
            return res.status(404).json({ error: 'Coach non trouvé' });
        }
        
        res.json({
            message: 'Coach mis à jour avec succès',
            coach
        });
    } catch (error) {
        console.error('Erreur lors de la mise à jour du coach:', error);
        
        if (error.name === 'CastError') {
            return res.status(400).json({ error: 'ID coach invalide' });
        }
        
        if (error.code === 11000) {
            return res.status(409).json({ error: 'Un coach avec ce nom existe déjà' });
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

// DELETE /api/coaches/:id - Supprimer un coach (soft delete)
router.delete('/:id', async (req, res) => {
    try {
        const coach = await Coach.findByIdAndUpdate(
            req.params.id,
            { isActive: false },
            { new: true }
        );
        
        if (!coach) {
            return res.status(404).json({ error: 'Coach non trouvé' });
        }
        
        res.json({ message: 'Coach supprimé avec succès' });
    } catch (error) {
        console.error('Erreur lors de la suppression du coach:', error);
        
        if (error.name === 'CastError') {
            return res.status(400).json({ error: 'ID coach invalide' });
        }
        
        res.status(500).json({ error: 'Erreur serveur interne' });
    }
});

// GET /api/coaches/:id/progress - Obtenir les progrès d'un coach
router.get('/:id/progress', async (req, res) => {
    try {
        const coachId = req.params.id;
        
        // Validate coach ID
        if (!coachId || coachId === 'undefined' || coachId === 'null') {
            return res.status(400).json({ error: 'ID coach invalide ou manquant' });
        }
        
        const coach = await Coach.findById(coachId);
        
        if (!coach) {
            return res.status(404).json({ error: 'Coach non trouvé' });
        }
        
        const progress = await Session.getCoachProgress(coachId);
        
        res.json(progress);
    } catch (error) {
        console.error('Erreur lors de la récupération des progrès:', error);
        
        if (error.name === 'CastError') {
            return res.status(400).json({ error: 'ID coach invalide' });
        }
        
        res.status(500).json({ error: 'Erreur serveur interne' });
    }
});

module.exports = router;
