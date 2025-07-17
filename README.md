# Coach Training Tracker - Guide de Déploiement

## 🚀 Déploiement sur Render

### Étape 1 : Préparation du Code

Votre code est maintenant prêt pour PostgreSQL ! Assurez-vous que tous les fichiers sont commités sur GitHub.

### Étape 2 : Créer la Base de Données PostgreSQL sur Render

1. **Connectez-vous à [render.com](https://render.com)**
2. **Cliquez sur "New +" → "PostgreSQL"**
3. **Configuration de la base :**
   - **Name** : `coach-tracker-db`
   - **Database** : `coach_tracker`
   - **User** : `coach_user`
   - **Region** : Choisissez proche de vous
   - **Plan** : Free
4. **Cliquez sur "Create Database"**
5. **Copiez l'URL de connexion** (format : `postgresql://username:password@host:port/database`)

### Étape 3 : Créer le Service Web

1. **Cliquez sur "New +" → "Web Service"**
2. **Connectez votre repository GitHub**
3. **Configuration du service :**
   - **Name** : `coach-tracker`
   - **Environment** : `Node`
   - **Region** : Même région que votre DB
   - **Branch** : `main`
   - **Build Command** : `npm install`
   - **Start Command** : `npm start`
   - **Plan** : Free

### Étape 4 : Variables d'Environnement

Dans la section "Environment Variables" :

```
DATABASE_URL = [URL copiée de votre PostgreSQL]
NODE_ENV = production
PORT = 10000
```

### Étape 5 : Déployer

1. **Cliquez sur "Create Web Service"**
2. **Le déploiement se lance automatiquement**
3. **Attendez que le statut soit "Live"**

### Étape 6 : Vérifier le Déploiement

1. **Cliquez sur l'URL de votre service**
2. **Vous devriez voir l'application fonctionner**
3. **Les coachs Soukeyna et Fabacary sont automatiquement créés**

## 🔧 Commandes Utiles

```bash
# Installer les dépendances
npm install

# Démarrer en local (nécessite PostgreSQL local)
npm start

# Démarrer en développement
npm run dev

# Test de santé de l'API
curl https://votre-app.onrender.com/api/health
```

## 📋 Structure de l'Application

```
coach-track/
├── server.js              # Serveur principal
├── package.json           # Dépendances
├── .env                   # Variables locales (ignoré par git)
├── .gitignore            # Fichiers ignorés
├── database/
│   ├── postgres.js       # Connexion PostgreSQL
│   └── init.js          # Initialisation (legacy)
└── public/
    ├── index.html        # Interface utilisateur
    ├── styles.css        # Styles
    └── script.js         # JavaScript frontend
```

## 🎯 Fonctionnalités

- ✅ **Deux coachs fixes** : Soukeyna et Fabacary
- ✅ **Suivi des heures** : Reformer, Tapis, Chaise
- ✅ **Types d'entraînement** : Pratique personnelle, Observation
- ✅ **Objectifs automatiques** : Calcul des pourcentages
- ✅ **Interface française** : Entièrement traduite
- ✅ **Base de données persistante** : PostgreSQL sur Render
- ✅ **Responsive design** : Fonctionne sur mobile

## 🔍 Objectifs d'Entraînement

| Équipement | Pratique | Observation | Total |
|------------|----------|-------------|--------|
| Reformer   | 22h      | 5h         | 27h    |
| Tapis      | 12h      | 3h         | 15h    |
| Chaise     | 12h      | 3h         | 15h    |

## 🛠️ Dépannage

### Erreur de Connexion Base de Données
- Vérifiez que `DATABASE_URL` est correctement configurée
- Assurez-vous que la base PostgreSQL est active

### Erreur de Build
- Vérifiez que `package.json` contient toutes les dépendances
- Assurez-vous que `npm install` fonctionne localement

### Application ne démarre pas
- Vérifiez les logs dans Render Dashboard
- Assurez-vous que `PORT` est défini à 10000

## 🔐 Sécurité

- Les credentials de base de données sont dans les variables d'environnement
- Le fichier `.env` est ignoré par git
- SSL automatiquement activé sur Render

## 📞 Support

Si vous rencontrez des problèmes :
1. Vérifiez les logs dans Render Dashboard
2. Testez l'API avec `/api/health`
3. Assurez-vous que la base de données est accessible

---

**Votre application est maintenant déployée et prête à l'emploi !** 🎉
