// src/components/ThemeSelector.js

import React, { useEffect, useState } from 'react';

const THEMES_PRECHARGES = [
  "Films d'horreur", "Objets qu'on trouve dans une trousse", "Pays commençant par B",
  "Choses rouges", "Séries Netflix", "Expressions françaises", "Célébrités mortes",
  "Rappels scolaires", "Inventions françaises", "Jeux vidéo connus", "Plats vietnamiens",
  "Langages de programmation", "Capitale européenne", "Insectes", "Aliments qu’on déteste",
  "Marques de luxe", "Couleurs moches", "Sports en salle", "Rêves bizarres"
];

function ThemeSelector({ onSelect }) {
  const [propositions, setPropositions] = useState([]);

  useEffect(() => {
    const shuffle = [...THEMES_PRECHARGES].sort(() => 0.5 - Math.random());
    setPropositions(shuffle.slice(0, 3));
  }, []);

  return (
    <div style={{ marginTop: 30 }}>
      <h3>🃏 Carte CRAKITOKO jouée !</h3>
      <p>Choisis un thème :</p>
      <ul>
        {propositions.map((theme, i) => (
          <li key={i} style={{ marginTop: 8 }}>
            <button onClick={() => onSelect(theme)}>{theme}</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default ThemeSelector;
