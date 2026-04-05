import {NavLink} from 'react-router-dom';

const navItems = [
  {to: '/', label: 'الرئيسية'},
  {to: '/about', label: 'نبذة'},
  {to: '/privacy', label: 'الخصوصية'},
  {to: '/terms', label: 'الشروط'},
];

export function Layout({children}) {
  return (
    <div className="app-shell" dir="rtl">
      <header className="topbar">
        <div className="brand">رقية</div>
        <nav className="nav-links" aria-label="التنقل الرئيسي">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({isActive}) => (isActive ? 'nav-link active' : 'nav-link')}>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="page-container">{children}</main>

      <footer className="footer">
        <p>تطبيق رقية مجاني ويعمل دون اتصال بالإنترنت.</p>
      </footer>
    </div>
  );
}
