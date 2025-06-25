// src/components/VotePanel.js

import React, { useEffect, useState } from 'react';

function VotePanel({ pseudoJoueurActif, onVoteResult, isMyTurn }) {
  const [vote, setVote] = useState(null);
  const [timer, setTimer] = useState(5);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer(t => {
        if (t <= 1) {
          clearInterval(interval);
          terminerVote();
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const terminerVote = () => {
    // Pour l’instant simple : 1 seul joueur = son vote décide
    if (vote === 'valider') {
      onVoteResult('validé');
    } else {
      onVoteResult('refusé');
    }
  };

  if (isMyTurn) {
    return <p>🗳️ En attente des votes des autres joueurs...</p>;
  }

  return (
    <div style={{ marginTop: 30 }}>
      <p>🗳️ Validez-vous la réponse de <strong>{pseudoJoueurActif}</strong> ?</p>
      <p>Temps restant : {timer}s</p>
      <button onClick={() => setVote('valider')} disabled={vote}>✅ Valider</button>
      <button onClick={() => setVote('refuser')} disabled={vote} style={{ marginLeft: 10 }}>❌ Refuser</button>
    </div>
  );
}

export default VotePanel;
