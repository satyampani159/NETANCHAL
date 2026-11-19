import { GameScreen } from './screens/GameScreen';
import { LandingScreen } from './screens/LandingScreen';
import { LobbyScreen } from './screens/LobbyScreen';
import { ResultsOverlay } from './screens/ResultsOverlay';
import { useScreen } from './state/navigationStore';

export function AppShell() {
  const screen = useScreen();
  switch (screen.name) {
    case 'landing':
      return <LandingScreen />;
    case 'lobby':
      return <LobbyScreen />;
    case 'game':
      return <GameScreen room={screen.room} initialState={screen.initialState} mySlot={screen.mySlot} />;
    case 'results':
      return <ResultsOverlay result={screen.result} mySlot={screen.mySlot} />;
  }
}
