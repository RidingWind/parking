import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { MapPin, List, Navigation, Store, User } from 'lucide-react';

const tabs = [
  { to: '/', icon: MapPin, label: '地图' },
  { to: '/list', icon: List, label: '列表' },
  { to: '/nearby', icon: Navigation, label: '附近' },
  { to: '/register', icon: Store, label: '登记' },
  { to: '/mine', icon: User, label: '我的' },
];

const Layout = () => {
  const location = useLocation();
  const isDetailPage = location.pathname.startsWith('/detail/');

  return (
    <div className="min-h-screen bg-muted/30 flex justify-center">
      <div className="w-full max-w-[480px] min-h-screen bg-background flex flex-col relative shadow-lg">
        <main className="flex-1 pb-[60px] overflow-y-auto">
          <Outlet />
        </main>
        {!isDetailPage && (
          <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] h-[60px] bg-card border-t border-border flex items-center justify-around z-50">
            {tabs.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  }`
                }
              >
                <Icon size={20} strokeWidth={1.8} />
                <span className="text-[10px]">{label}</span>
              </NavLink>
            ))}
          </nav>
        )}
      </div>
    </div>
  );
};

export default Layout;
