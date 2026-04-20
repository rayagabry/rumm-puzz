import { useState } from 'react';
import type { Difficulty } from './domain/tile';
import HomeScreen from './screens/HomeScreen';
import PuzzleScreen from './components/PuzzleScreen';
import WinScreen from './screens/WinScreen';
import { isDifficultyExhausted } from './state/usePuzzle';

type Screen =
  | { kind: 'home' }
  | { kind: 'puzzle'; difficulty: Difficulty }
  | { kind: 'win'; moves: number; par: number; difficulty: Difficulty };

export default function App() {
  const [screen, setScreen] = useState<Screen>({ kind: 'home' });

  switch (screen.kind) {
    case 'home':
      return (
        <HomeScreen
          onSelect={(difficulty) => setScreen({ kind: 'puzzle', difficulty })}
        />
      );
    case 'puzzle':
      return (
        <PuzzleScreen
          difficulty={screen.difficulty}
          onWin={(moves, par) =>
            setScreen({ kind: 'win', moves, par, difficulty: screen.difficulty })
          }
          onHome={() => setScreen({ kind: 'home' })}
        />
      );
    case 'win':
      return (
        <WinScreen
          moves={screen.moves}
          par={screen.par}
          exhausted={isDifficultyExhausted(screen.difficulty)}
          onNext={() => setScreen({ kind: 'puzzle', difficulty: screen.difficulty })}
          onHome={() => setScreen({ kind: 'home' })}
        />
      );
  }
}
