import { Link } from "react-router-dom";

function Header() {
  const user = null;

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

          <Link className="nav-link" to="/create-course">
            Створити курс
          </Link>
        </div>

        <div className="navbar-nav align-items-center">
          {user ? (
            <>
              <span className="navbar-text me-3">
                {user.name}
              </span>

              <button className="btn btn-outline-light">
                Вийти
              </button>
            </>
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