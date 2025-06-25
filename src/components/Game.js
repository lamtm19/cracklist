import React, { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import Timer from './Timer';
import WinnerPanel from './WinnerPanel';

const LETTER_PENALTIES = {
  'A': 0, 'B': 0, 'C': 0, 'D': 0, 'F': 0, 'G': 0, 'L': 0, 'M': 0, 'N': 0, 'P': 0, 'R': 0, 'S': 0, 'T': 0, 'V': 0,
  'E': 1, 'I': 1, 'J': 1, 'O': 1,
  'H': 2, 'K': 2, 'U': 2, 'Y': 2,
  'Q': 3, 'W': 3, 'X': 3, 'Z': 3
};

function Game({ roomCode, playerName, playerId, roomData, onLeaveRoom }) {
  const [selectedCard, setSelectedCard] = useState(null);
  const [vote, setVote] = useState(null);
  const [loading, setLoading] = useState(false);

  // Normaliser players pour qu'il soit toujours un Array valide
  const normalizedPlayers = React.useMemo(() => {
    if (!roomData?.players) return [];
    
    if (Array.isArray(roomData.players)) {
      return roomData.players.filter(p => p && (p.id || p.name));
    }
    
    if (typeof roomData.players === 'object') {
      return Object.values(roomData.players)
        .filter(p => p && typeof p === 'object' && (p.id || p.name));
    }
    
    return [];
  }, [roomData?.players]);

  const currentPlayer = normalizedPlayers.length > 0 && roomData?.currentPlayerIndex !== undefined
    ? normalizedPlayers[roomData.currentPlayerIndex] 
    : null;
  const isMyTurn = currentPlayer?.id === playerId;
  const myPlayer = normalizedPlayers.find(p => p.id === playerId) || null;
  const gamePhase = roomData?.gamePhase || 'theme-selection';

  // Vérifier s'il y a un gagnant
  const playersWithCards = normalizedPlayers.filter(p => p.cards && p.cards.length > 0);
  const playersWithoutCards = normalizedPlayers.filter(p => !p.cards || p.cards.length === 0);
  
  const firstWinner = playersWithoutCards.length > 0 && roomData?.gameStarted ? playersWithoutCards[0] : null;
  const gameEnded = playersWithCards.length <= 1 && roomData?.gameStarted && playersWithoutCards.length > 0;

  const selectTheme = async (theme) => {
    setLoading(true);
    try {
      await updateDoc(doc(db, 'rooms', roomCode), {
        currentTheme: theme,
        gamePhase: 'playing',
        themeSelectionPhase: false,
        currentTurnStartTime: Date.now()
      });
    } catch (err) {
      console.error('Erreur lors de la sélection du thème:', err);
    }
    setLoading(false);
  };

  const playCard = async (card) => {
    if (!card || loading || !isMyTurn) return;

    setLoading(true);
    try {
      const playerIndex = normalizedPlayers.findIndex(p => p.id === playerId);
      if (playerIndex === -1) return;

      // Créer une copie des joueurs
      const updatedPlayers = [...normalizedPlayers];
      const myCards = [...myPlayer.cards];
      const cardIndex = myCards.findIndex(c => c.id === card.id);
      
      if (cardIndex === -1) return;

      // Retirer la carte jouée
      myCards.splice(cardIndex, 1);
      updatedPlayers[playerIndex] = {
        ...updatedPlayers[playerIndex],
        cards: myCards
      };

      let updates = {
        players: updatedPlayers
      };

      // Traiter selon le type de carte
      if (card.type === 'letter') {
        // Pour les cartes lettres, on ajoute la carte jouée et on passe en vote
        updates.lastPlayedCard = {
          ...card,
          playerId: playerId,
          playerName: playerName,
          timestamp: Date.now()
        };
        updates.gamePhase = 'voting';
        updates.votingStartTime = Date.now();
        updates.votes = {};

      } else if (card.type === 'joker') {
        // Joker - pas de malus peu importe la lettre
        updates.lastPlayedCard = {
          ...card,
          playerId: playerId,
          playerName: playerName,
          timestamp: Date.now()
        };
        updates.gamePhase = 'voting';
        updates.votingStartTime = Date.now();
        updates.votes = {};

      } else if (card.type === 'reverse') {
        // Inverser le sens
        updates.direction = roomData.direction * -1;
        updates.lastPlayedCard = card;
        
        // Passer au joueur suivant
        const nextPlayerIndex = getNextPlayerIndex(roomData.currentPlayerIndex, updates.direction, normalizedPlayers);
        updates.currentPlayerIndex = nextPlayerIndex;
        updates.currentTurnStartTime = Date.now();
        updates.gamePhase = 'playing';
        
      } else if (card.type === 'stop') {
        // Sauter le prochain joueur
        updates.lastPlayedCard = card;
        const nextIndex = getNextPlayerIndex(roomData.currentPlayerIndex, roomData.direction, normalizedPlayers);
        const skipIndex = getNextPlayerIndex(nextIndex, roomData.direction, normalizedPlayers);
        updates.currentPlayerIndex = skipIndex;
        updates.currentTurnStartTime = Date.now();
        updates.gamePhase = 'playing';
        
      } else if (card.type === 'swap') {
        // Échanger avec un joueur aléatoire
        const otherPlayers = normalizedPlayers.filter(p => p.id !== playerId && p.cards && p.cards.length > 0);
        if (otherPlayers.length > 0) {
          const randomPlayer = otherPlayers[Math.floor(Math.random() * otherPlayers.length)];
          const randomPlayerIndex = normalizedPlayers.findIndex(p => p.id === randomPlayer.id);
          
          // Échanger les cartes
          const tempCards = [...updatedPlayers[playerIndex].cards];
          updatedPlayers[playerIndex].cards = [...updatedPlayers[randomPlayerIndex].cards];
          updatedPlayers[randomPlayerIndex].cards = tempCards;
          
          updates.lastPlayedCard = {
            ...card,
            swappedWith: randomPlayer.name
          };
        }
        
        // Passer au joueur suivant
        const nextPlayerIndex = getNextPlayerIndex(roomData.currentPlayerIndex, roomData.direction, normalizedPlayers);
        updates.currentPlayerIndex = nextPlayerIndex;
        updates.currentTurnStartTime = Date.now();
        updates.gamePhase = 'playing';
        
      } else if (card.type === 'crakitoko') {
        // Changement de thème
        updates.lastPlayedCard = card;
        updates.themeChoices = card.themes;
        updates.gamePhase = 'theme-selection';
        updates.themeSelectionPhase = true;
      }

      await updateDoc(doc(db, 'rooms', roomCode), updates);

    } catch (err) {
      console.error('Erreur lors du jeu de la carte:', err);
    }
    setLoading(false);
  };

  const submitVote = async (voteValue) => {
    if (loading || !roomData.lastPlayedCard) return;

    setLoading(true);
    try {
      const votes = { ...roomData.votes };
      votes[playerId] = voteValue;

      await updateDoc(doc(db, 'rooms', roomCode), {
        votes: votes
      });

      setVote(voteValue);

      // Vérifier si tous les votes sont reçus
      const eligibleVoters = normalizedPlayers.filter(p => 
        p.id !== roomData.lastPlayedCard.playerId && 
        p.cards && 
        p.cards.length > 0
      );

      if (Object.keys(votes).length >= eligibleVoters.length) {
        // Tous les votes sont reçus, traiter les résultats
        setTimeout(() => processVoteResults(votes), 1000);
      }
    } catch (err) {
      console.error('Erreur lors du vote:', err);
    }
    setLoading(false);
  };

  const processVoteResults = async (votes) => {
    if (!roomData.lastPlayedCard) return;

    const voteValues = Object.values(votes);
    const approvals = voteValues.filter(v => v === true).length;
    const rejections = voteValues.filter(v => v === false).length;
    const isApproved = approvals >= rejections;

    const playedPlayerIndex = normalizedPlayers.findIndex(p => p.id === roomData.lastPlayedCard.playerId);
    const updatedPlayers = [...normalizedPlayers];
    let updates = {};

    if (!isApproved) {
      // Réponse refusée - remettre la carte + 1 de la pioche
      if (playedPlayerIndex !== -1) {
        updatedPlayers[playedPlayerIndex].cards.push(roomData.lastPlayedCard);
        
        // Ajouter une carte de la pioche
        if (roomData.deck && roomData.deck.length > 0) {
          updatedPlayers[playedPlayerIndex].cards.push(roomData.deck[0]);
          updates.deck = roomData.deck.slice(1);
        }
      }
    } else if (roomData.lastPlayedCard.type === 'letter') {
      // Réponse acceptée - appliquer les malus pour les cartes lettres seulement
      const penalty = LETTER_PENALTIES[roomData.lastPlayedCard.letter] || 0;
      
      if (penalty > 0) {
        const nextPlayerIndex = getNextPlayerIndex(roomData.currentPlayerIndex, roomData.direction, normalizedPlayers);
        
        if (nextPlayerIndex !== -1 && roomData.deck) {
          for (let i = 0; i < penalty && i < roomData.deck.length; i++) {
            updatedPlayers[nextPlayerIndex].cards.push(roomData.deck[i]);
          }
          updates.deck = roomData.deck.slice(penalty);
        }
      }
    }
    // Pour le joker, pas de malus appliqué

    // Passer au joueur suivant
    const nextPlayerIndex = getNextPlayerIndex(roomData.currentPlayerIndex, roomData.direction, normalizedPlayers);
    
    updates.players = updatedPlayers;
    updates.currentPlayerIndex = nextPlayerIndex;
    updates.gamePhase = 'playing';
    updates.votes = {};
    updates.votingStartTime = null;
    updates.currentTurnStartTime = Date.now();

    await updateDoc(doc(db, 'rooms', roomCode), updates);
    setVote(null);
  };

  const handleTimeout = async (phase) => {
    if (phase === 'playing' && isMyTurn) {
      // Timeout pendant le tour - ajouter une carte
      const playerIndex = normalizedPlayers.findIndex(p => p.id === playerId);
      const updatedPlayers = [...normalizedPlayers];
      
      if (roomData.deck && roomData.deck.length > 0) {
        updatedPlayers[playerIndex].cards.push(roomData.deck[0]);
        
        const nextPlayerIndex = getNextPlayerIndex(roomData.currentPlayerIndex, roomData.direction, normalizedPlayers);
        
        await updateDoc(doc(db, 'rooms', roomCode), {
          players: updatedPlayers,
          deck: roomData.deck.slice(1),
          currentPlayerIndex: nextPlayerIndex,
          currentTurnStartTime: Date.now()
        });
      }
    } else if (phase === 'voting') {
      // Timeout du vote - traiter avec les votes actuels
      await processVoteResults(roomData.votes || {});
    }
  };

  // Conditions de rendu
  if ((firstWinner || gameEnded) && roomData?.gamePhase !== 'theme-selection') {
    return <WinnerPanel winner={firstWinner} playersWithoutCards={playersWithoutCards} onLeaveRoom={onLeaveRoom} />;
  }

  if (!roomData || !myPlayer || normalizedPlayers.length === 0) {
    return <div className="loading">Chargement de la partie...</div>;
  }

  if (!roomData.gameStarted) {
    return <div className="loading">En attente du démarrage de la partie...</div>;
  }

  return (
    <div className="game">
      <div className="game-header">
        <div className="room-info">
          <span className="room-code">Salle: {roomCode}</span>
          <button onClick={onLeaveRoom} className="btn btn-danger leave-btn">
            Quitter
          </button>
        </div>
        
        {roomData.currentTheme && (
          <div className="current-theme">
            <h2 className="theme-title">🎯 Thème actuel</h2>
            <div className="theme-display">{roomData.currentTheme}</div>
          </div>
        )}
      </div>

      {/* Zone de jeu centrale style UNO */}
      <div className="game-table">
        {/* Afficher les autres joueurs en haut */}
        <div className="other-players">
          {normalizedPlayers.filter(p => p.id !== playerId).map((player, index) => (
            <div 
              key={player.id} 
              className={`player-slot ${player.id === currentPlayer?.id ? 'active-player' : ''}`}
            >
              <div className="player-name">{player.name}</div>
              <div className="player-cards-count">
                {Array.from({ length: Math.min(player.cards?.length || 0, 7) }).map((_, i) => (
                  <div key={i} className="card-back"></div>
                ))}
                {player.cards?.length > 7 && <span className="cards-overflow">+{player.cards.length - 7}</span>}
              </div>
            </div>
          ))}
        </div>

        {/* Pile centrale */}
        <div className="center-pile">
          {roomData.lastPlayedCard && (
            <div className="last-played-card">
              <div className={`card card-${roomData.lastPlayedCard.type}`}>
                {roomData.lastPlayedCard.type === 'letter' && (
                  <div className="letter-card">
                    <span className="letter">{roomData.lastPlayedCard.letter}</span>
                    <span className="penalty">+{LETTER_PENALTIES[roomData.lastPlayedCard.letter]}</span>
                  </div>
                )}
                {roomData.lastPlayedCard.type === 'joker' && (
                  <div className="joker-card">🃏 JOKER</div>
                )}
                {roomData.lastPlayedCard.type === 'reverse' && (
                  <div className="special-card">🔄 SENS</div>
                )}
                {roomData.lastPlayedCard.type === 'swap' && (
                  <div className="special-card">
                    🔄 ÉCHANGE
                    {roomData.lastPlayedCard.swappedWith && (
                      <span className="swap-info">avec {roomData.lastPlayedCard.swappedWith}</span>
                    )}
                  </div>
                )}
                {roomData.lastPlayedCard.type === 'stop' && (
                  <div className="special-card">⏸️ STOP</div>
                )}
                {roomData.lastPlayedCard.type === 'crakitoko' && (
                  <div className="crakitoko-card">🎯 THÈME</div>
                )}
              </div>
              <div className="played-by">
                {roomData.lastPlayedCard.playerName}
              </div>
            </div>
          )}
        </div>

        {/* Direction du jeu */}
        <div className={`game-direction ${roomData.direction === -1 ? 'reverse' : ''}`}>
          {roomData.direction === 1 ? '↻' : '↺'}
        </div>
      </div>

      {/* Phase de sélection de thème */}
      {gamePhase === 'theme-selection' && isMyTurn && (
        <div className="theme-selection">
          <h2>🎯 Choisissez un thème</h2>
          <div className="theme-choices">
            {roomData.themeChoices?.map((theme, index) => (
              <button
                key={index}
                onClick={() => selectTheme(theme)}
                className="btn btn-theme"
                disabled={loading}
              >
                {theme}
              </button>
            ))}
          </div>
        </div>
      )}

      {gamePhase === 'theme-selection' && !isMyTurn && (
        <div className="waiting-theme">
          <p>⏳ {currentPlayer?.name} choisit le thème...</p>
        </div>
      )}

      {/* Phase de jeu */}
      {gamePhase === 'playing' && (
        <>
          <Timer
            duration={15}
            onTimeout={() => handleTimeout('playing')}
            startTime={roomData.currentTurnStartTime}
            active={isMyTurn}
          />

          {/* Mes cartes en bas */}
          <div className="my-cards-area">
            {isMyTurn && myPlayer?.cards && myPlayer.cards.length > 0 ? (
              <>
                <h3 className="your-turn-indicator">🎮 À votre tour !</h3>
                <div className="my-cards">
                  {myPlayer.cards.map((card) => (
                    <div
                      key={card.id}
                      className={`card card-${card.type} playable`}
                      onClick={() => playCard(card)}
                    >
                      {card.type === 'letter' && (
                        <div className="letter-card">
                          <span className="letter">{card.letter}</span>
                          <span className="penalty">+{LETTER_PENALTIES[card.letter]}</span>
                        </div>
                      )}
                      {card.type === 'joker' && (
                        <div className="joker-card">🃏 JOKER</div>
                      )}
                      {card.type === 'reverse' && (
                        <div className="special-card">🔄 SENS</div>
                      )}
                      {card.type === 'swap' && (
                        <div className="special-card">🔄 ÉCHANGE</div>
                      )}
                      {card.type === 'stop' && (
                        <div className="special-card">⏸️ STOP</div>
                      )}
                      {card.type === 'crakitoko' && (
                        <div className="crakitoko-card">🎯 THÈME</div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            ) : myPlayer?.cards && myPlayer.cards.length > 0 ? (
              <>
                <p className="waiting-turn">⏳ Tour de {currentPlayer?.name}</p>
                <div className="my-cards">
                  {myPlayer.cards.map((card) => (
                    <div
                      key={card.id}
                      className={`card card-${card.type}`}
                    >
                      {card.type === 'letter' && (
                        <div className="letter-card">
                          <span className="letter">{card.letter}</span>
                          <span className="penalty">+{LETTER_PENALTIES[card.letter]}</span>
                        </div>
                      )}
                      {card.type === 'joker' && (
                        <div className="joker-card">🃏 JOKER</div>
                      )}
                      {card.type === 'reverse' && (
                        <div className="special-card">🔄 SENS</div>
                      )}
                      {card.type === 'swap' && (
                        <div className="special-card">🔄 ÉCHANGE</div>
                      )}
                      {card.type === 'stop' && (
                        <div className="special-card">⏸️ STOP</div>
                      )}
                      {card.type === 'crakitoko' && (
                        <div className="crakitoko-card">🎯 THÈME</div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="finished-player">
                <h2>🎉 Vous avez terminé !</h2>
                <p>Vous n'avez plus de cartes. Regardez les autres joueurs finir la partie.</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Phase de vote */}
      {gamePhase === 'voting' && roomData.lastPlayedCard && (
        <div className="voting-phase">
          <Timer
            duration={10}
            onTimeout={() => handleTimeout('voting')}
            startTime={roomData.votingStartTime}
            active={true}
          />

          <div className="vote-info">
            <h2>🗳️ Vote en cours</h2>
            <p>
              <strong>{roomData.lastPlayedCard.playerName}</strong> affirme pouvoir dire un mot 
              {roomData.lastPlayedCard.type === 'letter' ? 
                ` commençant par ${roomData.lastPlayedCard.letter}` : 
                ' avec n\'importe quelle lettre (Joker)'
              }
              {' '}sur le thème "{roomData.currentTheme}"
            </p>
          </div>

          {roomData.lastPlayedCard.playerId !== playerId && myPlayer?.cards && myPlayer.cards.length > 0 ? (
            <div className="vote-buttons">
              <button
                onClick={() => submitVote(true)}
                disabled={loading || vote !== null}
                className="btn btn-success vote-btn"
              >
                ✅ Je pense qu'il/elle peut
              </button>
              <button
                onClick={() => submitVote(false)}
                disabled={loading || vote !== null}
                className="btn btn-danger vote-btn"
              >
                ❌ Je ne pense pas
              </button>
              {vote !== null && (
                <p className="vote-submitted">Vote enregistré !</p>
              )}
            </div>
          ) : myPlayer?.cards && myPlayer.cards.length === 0 ? (
            <div className="cannot-vote">
              <p>🎉 Vous avez terminé ! Vous ne pouvez plus voter.</p>
            </div>
          ) : (
            <div className="cannot-vote">
              <p>⏳ En attente des votes des autres joueurs...</p>
            </div>
          )}

          <div className="vote-progress">
            <p>Votes reçus: {Object.keys(roomData.votes || {}).length}/{Math.max(1, normalizedPlayers.filter(p => p.id !== roomData.lastPlayedCard.playerId && p.cards && p.cards.length > 0).length)}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function getNextPlayerIndex(currentIndex, direction, players) {
  const playersWithCards = players.filter(p => p.cards && p.cards.length > 0);
  if (playersWithCards.length === 0) return -1;

  let nextIndex = currentIndex;
  let attempts = 0;
  
  do {
    if (direction === 1) {
      nextIndex = (nextIndex + 1) % players.length;
    } else {
      nextIndex = nextIndex === 0 ? players.length - 1 : nextIndex - 1;
    }
    attempts++;
  } while (attempts < players.length && (!players[nextIndex] || !players[nextIndex].cards || players[nextIndex].cards.length === 0));
  
  return nextIndex;
}

export default Game;