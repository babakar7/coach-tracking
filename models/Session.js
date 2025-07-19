const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
    coachId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Coach',
        required: [true, 'L\'ID du coach est requis']
    },
    date: {
        type: Date,
        required: [true, 'La date est requise'],
        validate: {
            validator: function(value) {
                return value <= new Date();
            },
            message: 'La date ne peut pas être dans le futur'
        }
    },
    equipment: {
        type: String,
        required: [true, 'L\'équipement est requis'],
        enum: {
            values: ['reformer', 'mat', 'chair'],
            message: 'L\'équipement doit être reformer, mat ou chair'
        }
    },
    type: {
        type: String,
        required: [true, 'Le type d\'entraînement est requis'],
        enum: {
            values: ['practice', 'observation'],
            message: 'Le type doit être practice ou observation'
        }
    },
    hours: {
        type: Number,
        required: [true, 'Le nombre d\'heures est requis'],
        min: [0.5, 'Le minimum est 0.5 heure'],
        max: [24, 'Le maximum est 24 heures'],
        validate: {
            validator: function(value) {
                return value % 0.5 === 0;
            },
            message: 'Les heures doivent être des multiples de 0.5'
        }
    },
    notes: {
        type: String,
        maxlength: [500, 'Les notes ne peuvent pas dépasser 500 caractères'],
        trim: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Middleware pour mettre à jour updatedAt avant chaque sauvegarde
sessionSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Méthode statique pour obtenir le résumé des progrès d'un coach
sessionSchema.statics.getCoachProgress = async function(coachId) {
    const sessions = await this.find({ coachId });
    
    const progress = {
        reformer: { practice: 0, observation: 0, total: 0 },
        mat: { practice: 0, observation: 0, total: 0 },
        chair: { practice: 0, observation: 0, total: 0 }
    };
    
    // Objectifs d'entraînement
    const objectives = {
        reformer: { practice: 22, observation: 5, total: 27 },
        mat: { practice: 12, observation: 3, total: 15 },
        chair: { practice: 12, observation: 3, total: 15 }
    };
    
    // Calculer les heures actuelles
    sessions.forEach(session => {
        if (progress[session.equipment]) {
            progress[session.equipment][session.type] += session.hours;
        }
    });
    
    // Calculer les totaux et pourcentages
    Object.keys(progress).forEach(equipment => {
        const practiceHours = progress[equipment].practice;
        const observationHours = progress[equipment].observation;
        progress[equipment].total = practiceHours + observationHours;
        
        // Ajouter les objectifs et pourcentages
        progress[equipment].objectives = objectives[equipment];
        progress[equipment].practicePercentage = Math.min(100, 
            (practiceHours / objectives[equipment].practice) * 100);
        progress[equipment].observationPercentage = Math.min(100, 
            (observationHours / objectives[equipment].observation) * 100);
        progress[equipment].totalPercentage = Math.min(100, 
            (progress[equipment].total / objectives[equipment].total) * 100);
    });
    
    return progress;
};

// Index pour optimiser les requêtes
sessionSchema.index({ coachId: 1, date: -1 });
sessionSchema.index({ coachId: 1, equipment: 1 });
sessionSchema.index({ coachId: 1, type: 1 });
sessionSchema.index({ date: -1 });

module.exports = mongoose.model('Session', sessionSchema);
