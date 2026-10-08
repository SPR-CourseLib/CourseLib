import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";

function MyCourses() {
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    api.get("/my-courses/")
      .then(({ data }) => {
        if (active) setEnrollments(data);
      })
      .catch((requestError) => {
        if (active) {
          setError(
            requestError.response?.status === 401
              ? "Увійдіть в акаунт, щоб переглянути свої курси."
              : "Не вдалося завантажити список курсів. Спробуйте ще раз.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return <p>Завантаження курсів...</p>;
  }

  if (error) {
    return (
      <div className="alert alert-warning" role="alert">
        {error} {error.startsWith("Увійдіть") && <Link to="/login">Увійти</Link>}
      </div>
    );
  }

  return (
    <section>
      <h1 className="mb-4">Мої курси</h1>

      {enrollments.length === 0 ? (
        <div className="card">
          <div className="card-body">
            <p className="mb-3">Ви ще не записалися на жоден курс.</p>
            <Link className="btn btn-primary" to="/">
              Переглянути курси
            </Link>
          </div>
        </div>
      ) : (
        <div className="row">
          {enrollments.map(({ course, tx_hash, created_at }) => (
            <div className="col-md-6 col-lg-4 mb-4" key={course.id}>
              <article className="card h-100 shadow-sm">
                {course.cover_image && (
                  <img
                    src={course.cover_image}
                    className="card-img-top"
                    alt={course.title}
                    style={{ height: "190px", objectFit: "cover" }}
                  />
                )}

                <div className="card-body d-flex flex-column">
                  <span className="badge bg-primary mb-2 align-self-start">
                    {course.category || "Без категорії"}
                  </span>
                  <h2 className="h5 card-title">{course.title}</h2>
                  <p className="card-text">{course.short_description}</p>
                  <p className="small text-muted mb-2">Рівень: {course.level}</p>
                  <p className="small text-muted">
                    Дата запису: {new Date(created_at).toLocaleDateString("uk-UA")}
                  </p>

                  <div className="mt-auto d-flex flex-wrap gap-2">
                    <Link className="btn btn-outline-primary" to={`/course/${course.id}`}>
                      Відкрити курс
                    </Link>
                    <a
                      className="btn btn-outline-secondary"
                      href={`https://sepolia.etherscan.io/tx/${tx_hash}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Транзакція
                    </a>
                  </div>
                </div>
              </article>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default MyCourses;
