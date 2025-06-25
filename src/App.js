import React, { useState, useEffect } from 'react';
import { onSnapshot, doc } from 'firebase/firestore';
import { db } from './firebase';
import Home from './components/Home';
import Lobby from './components/Lobby';
import Game from './components/Game';
import './App.css';

function App() {
  const [gameState, setGameState] = useState('home'); // 'home', 'lobby', 'game'
  const [roomCode, setRoomCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [roomData, setRoomData] = useState(null);

  useEffect(() => {
    if (roomCode && gameState !== 'home') {
      console.log('🎯 App - Surveillance room:', roomCode);
      const unsubscribe = onSnapshot(doc(db, 'rooms', roomCode), (doc) => {
        console.log('📡 App - Snapshot reçu, existe:', doc.exists());
        if (doc.exists()) {
          const data = doc.data();
          console.log('📊 App - Données snapshot:', data);
          setRoomData(data);
          
          // Déterminer l'état du jeu
          if (data.gameStarted) {
            console.log('🎮 App - Passage en mode game');
            setGameState('game');
          } else {
            console.log('🏠 App - Passage en mode lobby');
            setGameState('lobby');
          }
        } else {
          // La room n'existe plus, retour à l'accueil
          console.log('❌ App - Room supprimée, retour accueil');
          setGameState('home');
          setRoomCode('');
          setRoomData(null);
        }
      });

      return () => unsubscribe();
    }
  }, [roomCode, gameState]);

  const handleJoinRoom = (code, name, id) => {
    setRoomCode(code);
    setPlayerName(name);
    setPlayerId(id);
    setGameState('lobby');
  };

  const handleLeaveRoom = () => {
    setGameState('home');
    setRoomCode('');
    setPlayerName('');
    setPlayerId('');
    setRoomData(null);
  };

  return (
    <div className="App">
      {gameState === 'home' && (
        <Home onJoinRoom={handleJoinRoom} />
      )}
      
      {gameState === 'lobby' && (
        <Lobby 
          roomCode={roomCode}
          playerName={playerName}
          playerId={playerId}
          roomData={roomData}
          onLeaveRoom={handleLeaveRoom}
        />
      )}
      
      {gameState === 'game' && (
        <Game 
          roomCode={roomCode}
          playerName={playerName}
          playerId={playerId}
          roomData={roomData}
          onLeaveRoom={handleLeaveRoom}
        />
      )}
    </div>
  );
}

export default App;