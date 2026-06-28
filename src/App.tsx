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
  const [page, setPage] = useState<Page>('progress');

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
      <Nav currentPage={page} onNavigate={navigate} />
      <main className="main">
        {page === 'progress' && <Progress />}
        {page === 'log' && <LogEntry />}
        {page === 'goals' && <Goals />}
      </main>
    </div>
  );
}

export default App;
