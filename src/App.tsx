import { useState } from 'react';
import HomeScreen from './screens/HomeScreen';
import PuzzleScreen from './components/PuzzleScreen';
import WinScreen from './screens/WinScreen';
import { isTierExhausted } from './state/usePuzzle';
import type { Difficulty } from './domain/tile';

type Screen =
  | { kind: 'home' }
  | { kind: 'puzzle'; difficulty: Difficulty }
  | { kind: 'win'; difficulty: Difficulty; moves: number; par: number; puzzleId: string };

export default function App() {
  const [screen, setScreen] = useState<Screen>({ kind: 'home' });

  switch (screen.kind) {
    case 'home':
      return (
        <HomeScreen
          onStart={(difficulty) => setScreen({ kind: 'puzzle', difficulty })}
        />
      );
    case 'puzzle':
      return (
        <PuzzleScreen
          difficulty={screen.difficulty}
          onWin={(moves, par, puzzleId) =>
            setScreen({ kind: 'win', difficulty: screen.difficulty, moves, par, puzzleId })
          }
          onHome={() => setScreen({ kind: 'home' })}
        />
      );
    case 'win':
      return (
        <WinScreen
          puzzleId={screen.puzzleId}
          moves={screen.moves}
          par={screen.par}
          exhausted={isTierExhausted(screen.difficulty)}
          onNext={() => setScreen({ kind: 'puzzle', difficulty: screen.difficulty })}
          onHome={() => setScreen({ kind: 'home' })}
        />
      );
  }
}
