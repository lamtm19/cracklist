import React, { useState } from 'react';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

const THEMES_LIST = [
  "Prénom masculin", "Prénom féminin", "Ville", "Pays", "Continent", "Animal", 
  "Fruit", "Légume", "Métier", "Objet", "Couleur", "Sport", "Film", "Série", 
  "Chanson", "Marque", "Moyen de transport", "Instrument de musique", "Langue", 
  "Livre", "Dessin animé", "Invention", "Monument", "Fleuve ou rivière", "Oiseau", 
  "Insecte", "Plante ou arbre", "Pièce de la maison", "Partie du corps", 
  "Alimentation", "Boisson", "Marque de vêtements", "Émotion", "Super-héros", 
  "Pokémon", "Pays qui commence par…", "Film de Disney", "Animal marin", 
  "Animal de la savane", "Animal de compagnie", "Pays en Europe", "Pays en Afrique", 
  "Ville française", "Ville américaine", "Objet électronique", "Pays où il fait chaud", 
  "Pays avec une mer", "Profession médicale", "Marque de voiture", "Équipe de foot", 
  "Personnage de manga", "Jeu vidéo", "Appli mobile", "Nom de famille courant", 
  "Chiffre ou nombre", "Mot en anglais", "Mot en français", "Signe du zodiaque", 
  "Emoji connu", "Appareil électroménager", "Nom de star internationale", 
  "Nom de star française", "Personnage historique", "Nom de dinosaure", 
  "Élément chimique", "Forme géométrique", "Langue morte", 
  "Pays commençant par une voyelle", "Mot avec 3 lettres", "Mot avec 5 lettres", 
  "Animal volant", "Pays limitrophe de la France", "Ville avec une plage", 
  "Métier en rapport avec l'école", "Métier en rapport avec la police", 
  "Métier en rapport avec les animaux", "Métier qu'on voit à la télé", 
  "Chanson connue", "Groupe de musique", "Chiffre impair", "Couleur primaire", 
  "Style musical", "Accessoire de mode", "Pays ayant gagné la Coupe du Monde", 
  "Mot finissant par -ette", "Mot finissant par -oir", "Mot qui rime avec \"chat\"", 
  "Mot qui rime avec \"on\""
];

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

const LETTER_PENALTIES = {
  'A': 0, 'B': 0, 'C': 0, 'D': 0, 'F': 0, 'G': 0, 'L': 0, 'M': 0, 'N': 0, 'P': 0, 'R': 0, 'S': 0, 'T': 0, 'V': 0,
  'E': 1, 'I': 1, 'J': 1, 'O': 1,
  'H': 2, 'K': 2, 'U': 2, 'Y': 2,
  'Q': 3, 'W': 3, 'X': 3, 'Z': 3
};

function generateCards() {
  const cards = [];
  
  // 5 cartes lettres aléatoires
  for (let i = 0; i < 5; i++) {
    cards.push({
      type: 'letter',
      letter: LETTERS[Math.floor(Math.random() * LETTERS.length)],
      id: `letter_${i}_${Date.now()}_${Math.random()}`
    });
  }
  
  // 1 joker
  cards.push({
    type: 'joker',
    id: `joker_${Date.now()}_${Math.random()}`
  });
  
  // 1 carte spéciale aléatoire
  const specialCards = ['reverse', 'swap', 'stop'];
  cards.push({
    type: specialCards[Math.floor(Math.random() * specialCards.length)],
    id: `special_${Date.now()}_${Math.random()}`
  });
  
  // 1 carte Crakitoko avec 3 thèmes aléatoires
  const shuffledThemes = [...THEMES_LIST].sort(() => 0.5 - Math.random());
  cards.push({
    type: 'crakitoko',
    themes: shuffledThemes.slice(0, 3),
    id: `crakitoko_${Date.now()}_${Math.random()}`
  });
  
  return cards;
}

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function generateDeck() {
  const deck = [];
  
  // Générer plusieurs cartes de chaque type pour la pioche
  for (let i = 0; i < 50; i++) {
    deck.push({
      type: 'letter',
      letter: LETTERS[Math.floor(Math.random() * LETTERS.length)],
      id: `deck_letter_${i}_${Date.now()}_${Math.random()}`
    });
  }
  
  for (let i = 0; i < 10; i++) {
    deck.push({
      type: 'joker',
      id: `deck_joker_${i}_${Date.now()}_${Math.random()}`
    });
  }
  
  for (let i = 0; i < 15; i++) {
    const specialCards = ['reverse', 'swap', 'stop'];
    deck.push({
      type: specialCards[Math.floor(Math.random() * specialCards.length)],
      id: `deck_special_${i}_${Date.now()}_${Math.random()}`
    });
  }
  
  for (let i = 0; i < 20; i++) {
    const shuffledThemes = [...THEMES_LIST].sort(() => 0.5 - Math.random());
    deck.push({
      type: 'crakitoko',
      themes: shuffledThemes.slice(0, 3),
      id: `deck_crakitoko_${i}_${Date.now()}_${Math.random()}`
    });
  }
  
  return deck.sort(() => 0.5 - Math.random());
}

function Home({ onJoinRoom }) {
  const [playerName, setPlayerName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const createRoom = async () => {
    if (!playerName.trim()) {
      setError('Veuillez entrer votre pseudo');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const roomCode = generateRoomCode();
      const playerId = `player_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      const hostPlayer = {
        id: playerId,
        name: playerName,
        isHost: true,
        cards: generateCards(),
        connected: true,
        lastSeen: Date.now()
      };
      
      const roomData = {
        code: roomCode,
        players: [hostPlayer], // IMPORTANT: Toujours un tableau
        gameStarted: false,
        currentTheme: '',
        currentPlayerIndex: 0,
        direction: 1,
        deck: generateDeck(),
        themesList: THEMES_LIST,
        createdAt: Date.now()
      };

      await setDoc(doc(db, 'rooms', roomCode), roomData);
      
      onJoinRoom(roomCode, playerName, playerId);
    } catch (err) {
      console.error('Erreur création room:', err);
      setError(`Erreur lors de la création de la salle: ${err.message}`);
    }

    setLoading(false);
  };

  const joinRoom = async () => {
    if (!playerName.trim() || !joinCode.trim()) {
      setError('Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const roomRef = doc(db, 'rooms', joinCode.toUpperCase());
      const roomDoc = await getDoc(roomRef);

      if (!roomDoc.exists()) {
        setError('Code de salle invalide');
        setLoading(false);
        return;
      }

      const roomData = roomDoc.data();
      
      // S'assurer que players est un tableau
      let currentPlayers = [];
      if (Array.isArray(roomData.players)) {
        currentPlayers = roomData.players;
      } else if (roomData.players && typeof roomData.players === 'object') {
        currentPlayers = Object.values(roomData.players);
      }
      
      if (currentPlayers.length >= 10) {
        setError('La salle est pleine (10 joueurs max)');
        setLoading(false);
        return;
      }

      // Vérifier si le joueur essaie de se reconnecter
      const existingPlayer = currentPlayers.find(p => p.name === playerName);
      
      if (existingPlayer) {
        // Reconnexion
        const playerIndex = currentPlayers.findIndex(p => p.id === existingPlayer.id);
        currentPlayers[playerIndex] = {
          ...existingPlayer,
          connected: true,
          lastSeen: Date.now()
        };
        
        await updateDoc(roomRef, {
          players: currentPlayers // Toujours écrire un tableau
        });
        
        onJoinRoom(joinCode.toUpperCase(), playerName, existingPlayer.id);
      } else {
        // Nouveau joueur
        const playerId = `player_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const newPlayer = {
          id: playerId,
          name: playerName,
          isHost: false,
          cards: generateCards(),
          connected: true,
          lastSeen: Date.now()
        };

        // Ajouter le nouveau joueur au tableau
        const updatedPlayers = [...currentPlayers, newPlayer];
        
        await updateDoc(roomRef, {
          players: updatedPlayers // Toujours écrire un tableau
        });
        
        onJoinRoom(joinCode.toUpperCase(), playerName, playerId);
      }
    } catch (err) {
      console.error('Erreur connexion:', err);
      setError(`Erreur lors de la connexion à la salle: ${err.message}`);
    }

    setLoading(false);
  };

  return (
    <div className="home">
      <div className="home-container">
        <h1 className="game-title">🎮 Crakitoko</h1>
        
        <div className="form-container">
          <input
            type="text"
            placeholder="Votre pseudo"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className="input-field"
            maxLength={20}
          />
          
          <button 
            onClick={createRoom}
            disabled={loading}
            className="btn btn-primary"
          >
            {loading ? 'Création...' : 'Créer une salle'}
          </button>
          
          <div className="separator">ou</div>
          
          <input
            type="text"
            placeholder="Code de la salle"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            className="input-field"
            maxLength={6}
          />
          
          <button 
            onClick={joinRoom}
            disabled={loading}
            className="btn btn-secondary"
          >
            {loading ? 'Connexion...' : 'Rejoindre la salle'}
          </button>
          
          {error && <div className="error-message">{error}</div>}
        </div>
        
        <div className="game-rules">
          <h3>🎯 Règles du jeu</h3>
          <p>Trouvez des mots commençant par la lettre de votre carte selon le thème donné !</p>
        </div>
      </div>
    </div>
  );
}

export default Home;