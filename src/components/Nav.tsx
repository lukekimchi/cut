import { useAuth } from '../hooks/useAuth';
import type { Page } from '../App';

interface NavProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

export function Nav({ currentPage, onNavigate }: NavProps) {
  const { signOut } = useAuth();

  const navItems: { page: Page; label: string; icon: string }[] = [
    { page: 'progress', label: 'Home', icon: '◉' },
    { page: 'log', label: 'Log', icon: '+' },
    { page: 'goals', label: 'Goals', icon: '◎' },
  ];

  return (
    <nav className="nav">
      <div className="nav-brand">cut.</div>
      <div className="nav-items">
        {navItems.map(item => (
          <button
            key={item.page}
            className={`nav-item ${currentPage === item.page ? 'active' : ''}`}
            onClick={() => onNavigate(item.page)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </div>
      <button className="nav-signout" onClick={signOut}>Sign out</button>
    </nav>
  );
}
