import React from 'react';

function WinnerPanel({ winner, playersWithoutCards, onLeaveRoom }) {
  const winners = playersWithoutCards || (winner ? [winner] : []);
  const isMultipleWinners = winners.length > 1;
  const isFirstWinner = winner && winners.length === 1; // Premier à finir

  return (
    <div className="winner-panel">
      <div className={`winner-container ${isFirstWinner ? 'first-winner' : ''}`}>
        {isFirstWinner && <div className="fireworks">🎆🎇✨</div>}
        <div className="confetti">🎉</div>
        <h1 className="winner-title">🏆 {isMultipleWinners ? 'Victoires !' : 'Victoire !'}</h1>
        
        {isMultipleWinners ? (
          <div className="multiple-winners">
            <p className="winner-message">Félicitations aux gagnants !</p>
            <div className="winners-list">
              {winners.map((player, index) => (
                <div key={player.id} className="winner-name">
                  🥇 {player.name}
                </div>
              ))}
            </div>
            <p className="winner-subtitle">
              Vous avez tous réussi à vous débarrasser de vos cartes !
            </p>
          </div>
        ) : winner ? (
          <div className="single-winner">
            <div className="winner-name">{winner.name}</div>
            <p className="winner-message">
              Félicitations ! Vous avez gagné en vous débarrassant de toutes vos cartes en premier !
            </p>
          </div>
        ) : (
          <div className="game-ended">
            <p className="winner-message">Partie terminée !</p>
          </div>
        )}
        
        <div className="winner-stats">
          <p>🃏 Objectif: Se débarrasser de toutes ses cartes</p>
          <p>⏱️ Fin de partie: {new Date().toLocaleTimeString()}</p>
        </div>
        
        <button 
          onClick={onLeaveRoom}
          className="btn btn-primary"
        >
          Retour à l'accueil
        </button>
      </div>
      
      <div className="celebration-background">
        <div className="confetti-piece">🎊</div>
        <div className="confetti-piece">✨</div>
        <div className="confetti-piece">🎉</div>
        <div className="confetti-piece">🌟</div>
        <div className="confetti-piece">🎊</div>
        <div className="confetti-piece">✨</div>
      </div>
    </div>
  );
}

export default WinnerPanel;