import { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { AuthForm } from './components/AuthForm';
import { Nav } from './components/Nav';
import { Dashboard } from './pages/Dashboard';
import { LogEntry } from './pages/LogEntry';
import { Progress } from './pages/Progress';
import { Goals } from './pages/Goals';

type Page = 'dashboard' | 'log' | 'progress' | 'goals';

function App() {
  const { user, loading } = useAuth();
  const [page, setPage] = useState<Page>('dashboard');

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
        {page === 'dashboard' && <Dashboard onNavigate={navigate} />}
        {page === 'log' && <LogEntry onNavigate={navigate} />}
        {page === 'progress' && <Progress />}
        {page === 'goals' && <Goals />}
      </main>
    </div>
  );
}

export default App;
