import { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { AuthForm } from './components/AuthForm';
import { Nav } from './components/Nav';
import { LogEntry } from './pages/LogEntry';
import { Progress } from './pages/Progress';
import { Goals } from './pages/Goals';

export type Page = 'progress' | 'log' | 'goals';

function App() {
  const { user, loading } = useAuth();
  const [page, setPage] = useState<Page>('log');

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-brand">cut.</div>
      </div>
    );
  }

  if (!user) return <AuthForm />;

  const navigate = (p: Page) => setPage(p);

  return (
    <div className="app">
      <header className="top-bar">
        <span className="top-bar-brand">cut.</span>
      </header>
      <main className="main">
        {page === 'progress' && <Progress />}
        {page === 'log' && <LogEntry />}
        {page === 'goals' && <Goals />}
      </main>
      <Nav currentPage={page} onNavigate={navigate} />
    </div>
  );
}

export default App;
