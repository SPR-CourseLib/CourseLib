import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      await api.post("/auth/login/", {
        username,
        password,
      });

      navigate("/");
    } catch (error) {
      setError("Невірний логін або пароль");
    }
  };

  return (
    <div className="row justify-content-center">
      <div className="col-md-6 col-lg-4">
        <div className="card shadow-sm border-0">
          <div className="card-body p-4">
            <h2 className="text-center mb-4">Вхід</h2>

            {error && (
              <div className="alert alert-danger">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label">
                  Ім'я користувача
                </label>

                <input
                  type="text"
                  className="form-control"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label">
                  Пароль
                </label>

                <input
                  type="password"
                  className="form-control"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <button className="btn btn-primary w-100">
                Увійти
              </button>
            </form>

            <p className="text-center mt-3 mb-0">
              Немає акаунта?{" "}
              <Link to="/register">
                Реєстрація
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;