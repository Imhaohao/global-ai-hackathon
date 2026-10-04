import App from './App.tsx';
import { DemoShell } from './web/DemoShell';

export default function WebApp() {
  return (
    <DemoShell>
      <App />
    </DemoShell>
  );
}
