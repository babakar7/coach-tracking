const mongoose = require('mongoose');
require('dotenv').config();

const Coach = require('../models/Coach');
const Session = require('../models/Session');

// Données des coaches par défaut
const defaultCoaches = [
    {
        name: 'Soukeyna',
        email: 'soukeyna@coachtrack.com',
        phone: '+221 77 123 4567'
    },
    {
        name: 'Fabacary',
        email: 'fabacary@coachtrack.com',
        phone: '+221 77 765 4321'
    }
];

// Fonction pour se connecter à MongoDB
async function connectToDatabase() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connecté à MongoDB');
    } catch (error) {
        console.error('❌ Erreur de connexion à MongoDB:', error.message);
        process.exit(1);
    }
}

// Fonction pour créer les coaches par défaut
async function seedCoaches() {
    try {
        console.log('🌱 Initialisation des coaches...');
        
        // Vérifier si des coaches existent déjà
        const existingCoaches = await Coach.find();
        
        if (existingCoaches.length > 0) {
            console.log('📋 Les coaches existent déjà:');
            existingCoaches.forEach(coach => {
                console.log(`   - ${coach.name} (${coach.email})`);
            });
            return existingCoaches;
        }
        
        // Créer les coaches par défaut
        const coaches = [];
        for (const coachData of defaultCoaches) {
            const coach = new Coach(coachData);
            const savedCoach = await coach.save();
            coaches.push(savedCoach);
            console.log(`✅ Coach créé: ${savedCoach.name}`);
        }
        
        console.log(`🎉 ${coaches.length} coaches créés avec succès!`);
        return coaches;
        
    } catch (error) {
        console.error('❌ Erreur lors de la création des coaches:', error.message);
        throw error;
    }
}

// Fonction pour créer des sessions d'exemple (optionnel)
async function seedSampleSessions(coaches) {
    try {
        console.log('🌱 Création de sessions d\'exemple...');
        
        // Vérifier si des sessions existent déjà
        const existingSessions = await Session.find();
        if (existingSessions.length > 0) {
            console.log('📋 Des sessions existent déjà, ignorer la création d\'exemples');
            return;
        }
        
        // Sessions d'exemple pour Soukeyna
        const sampleSessions = [
            {
                coachId: coaches[0]._id, // Soukeyna
                date: new Date('2025-01-15'),
                equipment: 'reformer',
                type: 'practice',
                hours: 2,
                notes: 'Session de pratique intensive'
            },
            {
                coachId: coaches[0]._id, // Soukeyna
                date: new Date('2025-01-16'),
                equipment: 'mat',
                type: 'observation',
                hours: 1.5,
                notes: 'Observation d\'un cours avancé'
            },
            {
                coachId: coaches[1]._id, // Fabacary
                date: new Date('2025-01-14'),
                equipment: 'chair',
                type: 'practice',
                hours: 1,
                notes: 'Première session sur chair'
            }
        ];
        
        let createdCount = 0;
        for (const sessionData of sampleSessions) {
            const session = new Session(sessionData);
            await session.save();
            createdCount++;
        }
        
        console.log(`✅ ${createdCount} sessions d'exemple créées`);
        
    } catch (error) {
        console.error('❌ Erreur lors de la création des sessions:', error.message);
        // Ne pas faire échouer le script pour les sessions d'exemple
    }
}

// Fonction pour afficher les statistiques
async function showStatistics() {
    try {
        const coachCount = await Coach.countDocuments();
        const sessionCount = await Session.countDocuments();
        
        console.log('\n📊 Statistiques de la base de données:');
        console.log(`   - Coaches: ${coachCount}`);
        console.log(`   - Sessions: ${sessionCount}`);
        
        // Afficher les progrès de chaque coach
        const coaches = await Coach.find();
        for (const coach of coaches) {
            const progress = await Session.getCoachProgress(coach._id);
            console.log(`\n👤 ${coach.name}:`);
            console.log(`   - Reformer: ${progress.reformer.total}h / 27h (${progress.reformer.totalPercentage.toFixed(1)}%)`);
            console.log(`   - Tapis: ${progress.mat.total}h / 15h (${progress.mat.totalPercentage.toFixed(1)}%)`);
            console.log(`   - Chaise: ${progress.chair.total}h / 15h (${progress.chair.totalPercentage.toFixed(1)}%)`);
        }
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'affichage des statistiques:', error.message);
    }
}

// Fonction principale
async function main() {
    console.log('🚀 Initialisation de la base de données...\n');
    
    try {
        // Se connecter à MongoDB
        await connectToDatabase();
        
        // Créer les coaches par défaut
        const coaches = await seedCoaches();
        
        // Créer des sessions d'exemple si demandé
        if (process.argv.includes('--with-examples')) {
            await seedSampleSessions(coaches);
        }
        
        // Afficher les statistiques
        await showStatistics();
        
        console.log('\n🎉 Initialisation terminée avec succès!');
        
    } catch (error) {
        console.error('\n❌ Erreur durant l\'initialisation:', error.message);
        process.exit(1);
    } finally {
        // Fermer la connexion MongoDB
        await mongoose.connection.close();
        console.log('🔌 Connexion MongoDB fermée');
    }
}

// Exécuter le script si appelé directement
if (require.main === module) {
    main();
}

module.exports = { seedCoaches, seedSampleSessions };
