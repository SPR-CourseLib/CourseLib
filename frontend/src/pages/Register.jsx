import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";

function Register() {
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
  });

  const [error, setError] = useState("");

  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      await api.post("/auth/register/", form);
      navigate("/");
    } catch (error) {
      setError("Помилка реєстрації");
    }
  };

  return (
    <div className="row justify-content-center">
      <div className="col-md-6 col-lg-5">
        <div className="card shadow-sm border-0">
          <div className="card-body p-4">
            <h2 className="text-center mb-4">
              Реєстрація
            </h2>

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
                  name="username"
                  className="form-control"
                  value={form.username}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label">
                  Email
                </label>

                <input
                  type="email"
                  name="email"
                  className="form-control"
                  value={form.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label">
                  Пароль
                </label>

                <input
                  type="password"
                  name="password"
                  className="form-control"
                  value={form.password}
                  onChange={handleChange}
                  minLength="8"
                  required
                />
              </div>

              <button className="btn btn-success w-100">
                Зареєструватися
              </button>
            </form>

            <p className="text-center mt-3 mb-0">
              Уже є акаунт?{" "}
              <Link to="/login">
                Увійти
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;