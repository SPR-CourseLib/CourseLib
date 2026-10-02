import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import api from "../api/axios";

function Header() {
  const [isAdmin, setIsAdmin] = useState(false);
  const location = useLocation();

  useEffect(() => {
    let active = true;

    if (!localStorage.getItem("accessToken")) {
      return () => {
        active = false;
      };
    }

    api.get("/auth/me/")
      .then(({ data }) => {
        if (active) setIsAdmin(Boolean(data.is_staff));
      })
      .catch(() => {
        if (active) setIsAdmin(false);
      });

    return () => {
      active = false;
    };
  }, [location.pathname]);

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

          {isAdmin && (
            <Link className="nav-link" to="/create-course">
              Створити курс
            </Link>
          )}
        </div>

        <div className="navbar-nav align-items-center">
          <Link className="nav-link" to="/login">
            Увійти
          </Link>

          <Link className="btn btn-primary" to="/register">
            Реєстрація
          </Link>
        </div>

      </div>
    </nav>
  );
}

export default Header;