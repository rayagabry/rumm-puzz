import { useState } from 'react';
import HomeScreen from './screens/HomeScreen';
import PuzzleScreen from './components/PuzzleScreen';
import WinScreen from './screens/WinScreen';
import { isLibraryExhausted } from './state/usePuzzle';

type Screen =
  | { kind: 'home' }
  | { kind: 'puzzle' }
  | { kind: 'win'; moves: number; par: number; puzzleId: string };

export default function App() {
  const [screen, setScreen] = useState<Screen>({ kind: 'home' });

  switch (screen.kind) {
    case 'home':
      return <HomeScreen onStart={() => setScreen({ kind: 'puzzle' })} />;
    case 'puzzle':
      return (
        <PuzzleScreen
          onWin={(moves, par, puzzleId) =>
            setScreen({ kind: 'win', moves, par, puzzleId })
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
          exhausted={isLibraryExhausted()}
          onNext={() => setScreen({ kind: 'puzzle' })}
          onHome={() => setScreen({ kind: 'home' })}
        />
      );
  }
}
