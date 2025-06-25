import React, { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

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

function generateCards() {
  const cards = [];
  
  // 8 cartes lettres aléatoires
  for (let i = 0; i < 5; i++) {
    cards.push({
      type: 'letter',
      letter: LETTERS[Math.floor(Math.random() * LETTERS.length)],
      id: `letter_${i}_${Date.now()}`
    });
  }
  
  // 1 joker
  cards.push({
    type: 'joker',
    id: `joker_${Date.now()}`
  });
  
  // 1 carte spéciale aléatoire
  const specialCards = ['reverse', 'swap', 'stop'];
  cards.push({
    type: specialCards[Math.floor(Math.random() * specialCards.length)],
    id: `special_${Date.now()}`
  });
  
  // 1 carte Crakitoko avec 3 thèmes aléatoires
  const shuffledThemes = [...THEMES_LIST].sort(() => 0.5 - Math.random());
  cards.push({
    type: 'crakitoko',
    themes: shuffledThemes.slice(0, 3),
    id: `crakitoko_${Date.now()}`
  });
  
  return cards;
}

function Lobby({ roomCode, playerName, playerId, roomData, onLeaveRoom }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Debug logs
  console.log('🏠 Lobby - roomData reçue:', roomData);
  console.log('🏠 Lobby - players:', roomData?.players);
  console.log('👤 Lobby - playerId:', playerId);

  // Normaliser players pour qu'il soit toujours un Array valide
  const normalizedPlayers = React.useMemo(() => {
    if (!roomData?.players) return [];
    
    // Si c'est déjà un Array, le retourner
    if (Array.isArray(roomData.players)) {
      // Vérifier que tous les joueurs ont les propriétés nécessaires
      return roomData.players.filter(p => p && p.id && p.name);
    }
    
    // Si c'est un Object, le convertir en Array avec plus de soin
    if (typeof roomData.players === 'object') {
      console.log('🔧 Conversion Object vers Array');
      const playersArray = Object.values(roomData.players)
        .filter(p => p && typeof p === 'object' && p.id && p.name);
      
      console.log('🔧 Joueurs après filtrage:', playersArray);
      return playersArray;
    }
    
    return [];
  }, [roomData?.players]);

  console.log('🔧 Players normalisés:', normalizedPlayers);

  const isHost = normalizedPlayers.find(p => p.id === playerId)?.isHost || false;
  const canStart = normalizedPlayers.length >= 2;

  console.log('👑 Lobby - isHost:', isHost);
  console.log('▶️ Lobby - canStart:', canStart);

  useEffect(() => {
    // Ne plus mettre à jour la présence si le jeu a commencé
    if (roomData?.gameStarted) {
      return; // Pas de mise à jour pendant le jeu
    }

    // Mettre à jour la présence du joueur seulement dans le lobby
    const updatePresence = async () => {
      if (roomData && normalizedPlayers.length > 0) {
        const playerIndex = normalizedPlayers.findIndex(p => p.id === playerId);
        if (playerIndex !== -1) {
          // SOLUTION RADICALE: Toujours réécrire le tableau complet pour éviter la corruption
          const updatedPlayers = [...normalizedPlayers];
          updatedPlayers[playerIndex] = {
            ...updatedPlayers[playerIndex],
            lastSeen: Date.now(),
            connected: true
          };
          
          // S'assurer qu'il y a au moins un hôte
          if (!updatedPlayers.some(p => p.isHost)) {
            updatedPlayers[0].isHost = true;
            console.log('👑 Attribution forcée des droits d\'hôte au premier joueur');
          }
          
          await updateDoc(doc(db, 'rooms', roomCode), {
            players: updatedPlayers
          });
          console.log('✅ Présence mise à jour avec tableau complet');
        }
      }
    };

    updatePresence();
    const interval = setInterval(updatePresence, 15000); // Toutes les 15 secondes

    return () => clearInterval(interval);
  }, [roomCode, playerId, normalizedPlayers, roomData]);

  const startGame = async () => {
    if (!canStart) {
      setError('Il faut au moins 2 joueurs pour commencer');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Choisir un joueur aléatoire pour choisir le thème initial
      const randomPlayerIndex = Math.floor(Math.random() * normalizedPlayers.length);
      
      // Préparer les joueurs pour le jeu (avec toutes leurs cartes)
      const gamePlayers = normalizedPlayers.map(player => ({
        ...player,
        cards: player.cards || generateCards() // S'assurer que chaque joueur a des cartes
      }));
      
      // Créer une carte Crakitoko avec 3 thèmes pour la sélection initiale
      const shuffledThemes = [...THEMES_LIST].sort(() => 0.5 - Math.random());
      const initialThemeChoices = shuffledThemes.slice(0, 3);
      
      console.log('🎯 Démarrage partie avec thèmes:', initialThemeChoices);
      
      await updateDoc(doc(db, 'rooms', roomCode), {
        gameStarted: true,
        currentPlayerIndex: randomPlayerIndex,
        themeSelectionPhase: true,
        gamePhase: 'theme-selection',
        currentRound: 1,
        gameStartTime: Date.now(),
        themeChoices: initialThemeChoices,
        players: gamePlayers // Assurer la cohérence
      });
      
      console.log('✅ Partie démarrée avec succès');
    } catch (err) {
      setError('Erreur lors du démarrage de la partie');
      console.error('💥 Erreur startGame:', err);
    }

    setLoading(false);
  };

  const leaveRoom = async () => {
    try {
      if (roomData && normalizedPlayers.length > 0) {
        const updatedPlayers = normalizedPlayers.filter(p => p.id !== playerId);
        
        if (updatedPlayers.length === 0) {
          // Supprimer la room si plus de joueurs
          // Note: Vous pourriez vouloir implémenter une fonction cloud pour nettoyer automatiquement
        } else {
          // Si l'hôte part, donner les droits d'hôte au premier joueur restant
          if (isHost && updatedPlayers.length > 0) {
            updatedPlayers[0].isHost = true;
          }
          
          // Toujours réécrire le tableau complet
          await updateDoc(doc(db, 'rooms', roomCode), {
            players: updatedPlayers
          });
        }
      }
    } catch (err) {
      console.error('Erreur lors de la sortie de la room:', err);
    }
    
    onLeaveRoom();
  };

  if (!roomData) {
    return <div className="loading">Chargement...</div>;
  }

  return (
    <div className="lobby">
      <div className="lobby-container">
        <div className="lobby-header">
          <h1>🎮 Salle: {roomCode}</h1>
          <button onClick={leaveRoom} className="btn btn-danger leave-btn">
            Quitter
          </button>
        </div>

        <div className="players-section">
          <h2>👥 Joueurs ({normalizedPlayers.length}/10)</h2>
          <div className="players-list">
            {normalizedPlayers.length > 0 ? normalizedPlayers.map((player, index) => {
              console.log('🎭 Rendu joueur:', player.name, 'isHost:', player.isHost);
              return (
                <div key={player.id} className={`player-card ${!player.connected ? 'disconnected' : ''}`}>
                  <span className="player-name">
                    {player.name}
                    {player.isHost && <span className="host-badge">👑</span>}
                    {!player.connected && <span className="disconnect-badge">📴</span>}
                  </span>
                </div>
              );
            }) : (
              <div>Chargement des joueurs...</div>
            )}
          </div>
        </div>

        {isHost && (
          <div className="host-controls">
            <h3>🎯 Contrôles d'hôte</h3>
            
            {!canStart && (
              <p className="warning">Il faut au moins 2 joueurs pour commencer la partie.</p>
            )}
            
            <button 
              onClick={startGame}
              disabled={!canStart || loading}
              className="btn btn-primary start-btn"
            >
              {loading ? 'Démarrage...' : 'Commencer la partie'}
            </button>
            
            {error && <div className="error-message">{error}</div>}
          </div>
        )}

        {!isHost && (
          <div className="waiting-message">
            <p>⏳ En attente que l'hôte lance la partie...</p>
          </div>
        )}

        <div className="lobby-info">
          <h3>📋 Informations</h3>
          <ul>
            <li>🎯 Objectif : Se débarrasser de toutes ses cartes en premier !</li>
            <li>⏱️ 15 secondes pour jouer, 5 secondes pour voter</li>
            <li>🃏 Utilisez les cartes spéciales à bon escient</li>
            <li>🏆 Le premier sans cartes gagne !</li>
            <li>👥 Les joueurs sans cartes continuent à regarder</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default Lobby;