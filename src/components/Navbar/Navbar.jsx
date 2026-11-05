import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import styles from './Navbar.module.css';

function Navbar() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const isAuthPage = location.pathname === '/auth';

  return (
    <nav className={styles.navbar}>
      <div className={styles.inner}>
        <NavLink to="/" className={styles.brand}>
          <span className={styles.brandIcon}>🎙️</span>
          <span className={styles.brandName}>GermanLive</span>
        </NavLink>

        {isAuthenticated && !isAuthPage && (
          <ul className={styles.navLinks}>
            <li>
              <NavLink
                to="/translate"
                className={({ isActive }) =>
                  isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
                }
              >
                Translate
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/account"
                className={({ isActive }) =>
                  isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
                }
              >
                Account
              </NavLink>
            </li>
          </ul>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
