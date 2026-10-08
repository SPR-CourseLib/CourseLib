import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { AUTH_STATE_EVENT, clearAuthTokens } from "../auth";

function Header() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => Boolean(localStorage.getItem("accessToken")),
  );
  const [isAdmin, setIsAdmin] = useState(false);
  const [username, setUsername] = useState("");
  const location = useLocation();
  const navigate = useNavigate();

  const loadUser = useCallback(async () => {
    const accessToken = localStorage.getItem("accessToken");
    setIsAuthenticated(Boolean(accessToken));

    if (!accessToken) {
      setIsAdmin(false);
      setUsername("");
      return;
    }

    try {
      const { data } = await api.get("/auth/me/");
      if (localStorage.getItem("accessToken") === accessToken) {
        setIsAdmin(Boolean(data.is_staff));
        setUsername(data.username || "");
      }
    } catch {
      if (localStorage.getItem("accessToken") === accessToken) {
        setIsAdmin(false);
        setUsername("");
      }
    }
  }, []);

  useEffect(() => {
    loadUser();
    window.addEventListener(AUTH_STATE_EVENT, loadUser);
    return () => {
      window.removeEventListener(AUTH_STATE_EVENT, loadUser);
    };
  }, [loadUser, location.pathname]);

  const handleLogout = () => {
    clearAuthTokens();
    navigate("/");
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
      <div className="container">

        <Link className="navbar-brand" to="/">
          CourseLib
        </Link>

        <div className="navbar-nav me-auto">
          <Link className="nav-link" to="/">
            Курси
          </Link>

          {isAuthenticated && (
            <Link className="nav-link" to="/my-courses">
              Мої курси
            </Link>
          )}

          {isAdmin && (
            <Link className="nav-link" to="/create-course">
              Створити курс
            </Link>
          )}
        </div>

        <div className="navbar-nav align-items-center">
          {isAuthenticated ? (
            <div className="d-flex align-items-center gap-3">
              {username && (
                <span className="navbar-text text-light">
                  {username}
                </span>
              )}
              <button
                type="button"
                className="btn btn-outline-light"
                onClick={handleLogout}
              >
                Вийти
              </button>
            </div>
          ) : (
            <>
              <Link className="nav-link" to="/login">
                Увійти
              </Link>

              <Link className="btn btn-primary" to="/register">
                Реєстрація
              </Link>
            </>
          )}
        </div>

      </div>
    </nav>
  );
}

export default Header;
