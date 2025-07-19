# Coach Training Tracker - MongoDB Edition

Application de suivi d'entraînement pour les coachs Pilates avec base de données MongoDB.

## 🚀 Aperçu

Cette application permet aux coachs de suivre leurs heures d'entraînement sur différents équipements Pilates :
- **Reformer** : 22h pratique + 5h observation = 27h total
- **Tapis** : 12h pratique + 3h observation = 15h total  
- **Chaise** : 12h pratique + 3h observation = 15h total

## 🏗️ Architecture

### Backend
- **Node.js** avec Express.js
- **MongoDB** avec Mongoose ODM
- **Validation** avec express-validator
- **Architecture modulaire** (routes, modèles, utilitaires)

### Frontend
- **Interface française** complète
- **Design responsive** 
- **JavaScript vanilla** moderne
- **API REST** intégrée

## 📦 Installation

### Prérequis
- Node.js 18+
- MongoDB 6.0+ (local ou Atlas)
- npm ou yarn

### Étapes d'installation

1. **Cloner le projet**
```bash
git clone https://github.com/babakar7/coach-tracking.git
cd coach-tracking
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Configurer l'environnement**
```bash
cp .env.example .env
```

Éditer `.env` :
```env
MONGODB_URI=mongodb://localhost:27017/coach_tracking
NODE_ENV=development
PORT=3000
```

4. **Démarrer MongoDB**
```bash
# Si MongoDB est installé localement
mongod

# Ou utiliser Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

5. **Initialiser la base de données**
```bash
npm run seed
```

6. **Démarrer l'application**
```bash
npm start
# ou pour le développement
npm run dev
```

## 🎯 Fonctionnalités

### ✅ Coaches
- **Deux coaches prédéfinis** : Soukeyna et Fabacary
- **Gestion complète** (CRUD) des coaches
- **Validation** des données
- **Soft delete** (désactivation au lieu de suppression)

### ✅ Sessions d'entraînement
- **Ajout** de sessions avec date, équipement, type et durée
- **Validation** automatique des données
- **Historique** complet des sessions
- **Filtrage** par équipement
- **Suppression** individuelle ou en masse

### ✅ Suivi des progrès
- **Calcul automatique** des pourcentages
- **Visualisation** des progrès par équipement
- **Objectifs** clairement définis
- **Interface** intuitive avec barres de progression

## 🗂️ Structure du projet

```
coach-track-mongodb/
├── server.js              # Point d'entrée principal
├── package.json           # Dépendances et scripts
├── .env                   # Variables d'environnement
├── models/                # Modèles Mongoose
│   ├── Coach.js           # Modèle Coach
│   └── Session.js         # Modèle Session
├── routes/                # Routes API
│   ├── coaches.js         # Routes des coaches
│   └── sessions.js        # Routes des sessions
├── utils/                 # Utilitaires
│   └── seed.js           # Script d'initialisation
└── public/               # Frontend
    ├── index.html        # Interface utilisateur
    ├── styles.css        # Styles CSS
    └── script.js         # JavaScript frontend
```

## 🔧 Scripts disponibles

```bash
# Démarrer l'application
npm start

# Développement avec rechargement automatique
npm run dev

# Initialiser la base de données
npm run seed

# Initialiser avec des données d'exemple
npm run seed -- --with-examples
```

## 🌐 API Endpoints

### Coaches
- `GET /api/coaches` - Liste tous les coaches
- `GET /api/coaches/:id` - Détails d'un coach
- `POST /api/coaches` - Créer un coach
- `PUT /api/coaches/:id` - Mettre à jour un coach
- `DELETE /api/coaches/:id` - Supprimer un coach (soft delete)
- `GET /api/coaches/:id/progress` - Progrès d'un coach

### Sessions
- `GET /api/coaches/:id/sessions` - Sessions d'un coach
- `POST /api/coaches/:id/sessions` - Ajouter une session
- `GET /api/sessions/:id` - Détails d'une session
- `PUT /api/sessions/:id` - Mettre à jour une session
- `DELETE /api/sessions/:id` - Supprimer une session
- `DELETE /api/coaches/:id/sessions` - Supprimer toutes les sessions

### Système
- `GET /api/health` - État de santé de l'application

## 🔐 Validation des données

### Coaches
- **Nom** : 2-50 caractères, unique
- **Email** : Format email valide (optionnel)
- **Téléphone** : Format mobile valide (optionnel)

### Sessions
- **Date** : Date valide, pas dans le futur
- **Équipement** : reformer, mat, ou chair
- **Type** : practice ou observation
- **Heures** : 0.5-24h, multiples de 0.5
- **Notes** : Texte libre jusqu'à 500 caractères (optionnel)

## 🚀 Déploiement

### MongoDB Atlas (Production)

1. **Créer un cluster MongoDB Atlas**
   - Aller sur [mongodb.com/atlas](https://www.mongodb.com/atlas)
   - Créer un cluster gratuit
   - Configurer l'utilisateur et l'IP whitelist

2. **Configurer les variables d'environnement**
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/coach_tracking
NODE_ENV=production
PORT=10000
```

### Render.com

1. **Créer un service web**
   - Connecter le repository GitHub
   - Configurer les variables d'environnement
   - Déployer automatiquement

2. **Variables d'environnement Render**
```
MONGODB_URI=mongodb+srv://...
NODE_ENV=production
PORT=10000
```

## 📊 Base de données

### Collection `coaches`
```javascript
{
  _id: ObjectId,
  name: String,
  email: String,
  phone: String,
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### Collection `sessions`
```javascript
{
  _id: ObjectId,
  coachId: ObjectId,
  date: Date,
  equipment: String,
  type: String,
  hours: Number,
  notes: String,
  createdAt: Date,
  updatedAt: Date
}
```

## 🛠️ Développement

### Ajouter un nouveau coach
```bash
curl -X POST http://localhost:3000/api/coaches \
  -H "Content-Type: application/json" \
  -d '{"name": "Nouveau Coach", "email": "coach@example.com"}'
```

### Ajouter une session
```bash
curl -X POST http://localhost:3000/api/coaches/:id/sessions \
  -H "Content-Type: application/json" \
  -d '{"date": "2025-01-20", "equipment": "reformer", "type": "practice", "hours": 2}'
```

## 🔍 Dépannage

### Erreur de connexion MongoDB
```bash
# Vérifier que MongoDB est démarré
mongosh --eval "db.runCommand({ping: 1})"

# Vérifier les logs
npm start 2>&1 | grep -i mongo
```

### Réinitialiser la base de données
```bash
# Supprimer toutes les données
mongosh coach_tracking --eval "db.dropDatabase()"

# Réinitialiser avec les données par défaut
npm run seed
```

## 📝 Logs

L'application génère des logs détaillés :
- ✅ Connexions réussies
- ❌ Erreurs de validation
- 📊 Statistiques de la base
- 🔄 Opérations CRUD

## 🎨 Interface utilisateur

- **Design moderne** avec gradients
- **Responsive** pour mobile et desktop
- **Français** intégral
- **Notifications** toast
- **Indicateurs** de progression visuels

## 🚦 Tests

### Test manuel des endpoints
```bash
# Santé de l'application
curl http://localhost:3000/api/health

# Liste des coaches
curl http://localhost:3000/api/coaches

# Progrès d'un coach
curl http://localhost:3000/api/coaches/:id/progress
```

## 📈 Performances

- **Indexes MongoDB** optimisés
- **Connexion poolée** avec Mongoose
- **Validation** côté client et serveur
- **Gestion d'erreurs** robuste

## 🔄 Changelog

### Version 2.0.0 (MongoDB)
- ✅ Migration complète vers MongoDB
- ✅ Architecture modulaire
- ✅ Validation robuste
- ✅ Meilleure gestion des erreurs
- ✅ Interface préservée

### Version 1.0.0 (PostgreSQL)
- ✅ Version initiale PostgreSQL
- ✅ Interface française
- ✅ Fonctionnalités de base

## 🤝 Contribution

Les contributions sont les bienvenues ! Veuillez :
1. Fork le projet
2. Créer une branche feature
3. Committer les changements
4. Pousser vers la branche
5. Ouvrir une Pull Request

## 📄 License

MIT License - voir le fichier LICENSE pour plus de détails.

---

**Développé avec ❤️ pour les coachs Pilates**
