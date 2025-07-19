const mongoose = require('mongoose');

const coachSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Le nom du coach est requis'],
        trim: true,
        unique: true,
        minlength: [2, 'Le nom doit contenir au moins 2 caractères'],
        maxlength: [50, 'Le nom ne peut pas dépasser 50 caractères']
    },
    email: {
        type: String,
        trim: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email invalide']
    },
    phone: {
        type: String,
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true
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
coachSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Méthode pour obtenir le résumé des sessions
coachSchema.methods.getSessionsSummary = async function() {
    const Session = mongoose.model('Session');
    
    const sessions = await Session.find({ coachId: this._id });
    
    const summary = {
        totalSessions: sessions.length,
        totalHours: sessions.reduce((sum, session) => sum + session.hours, 0),
        byEquipment: {
            reformer: { practice: 0, observation: 0, total: 0 },
            mat: { practice: 0, observation: 0, total: 0 },
            chair: { practice: 0, observation: 0, total: 0 }
        }
    };
    
    sessions.forEach(session => {
        if (summary.byEquipment[session.equipment]) {
            summary.byEquipment[session.equipment][session.type] += session.hours;
            summary.byEquipment[session.equipment].total += session.hours;
        }
    });
    
    return summary;
};

// Index pour optimiser les requêtes
coachSchema.index({ isActive: 1 });

module.exports = mongoose.model('Coach', coachSchema);
