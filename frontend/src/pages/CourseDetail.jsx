import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";
import VideoModal from "../components/VideoModal";
import FormattedText from "../components/FormattedText";
import { signEnrollment, startCourseEnrollment } from "../blockchain/enrollment";

function getEnrollmentErrorMessage(error) {
  const responseData = error.response?.data;

  if (typeof responseData === "string") {
    return responseData;
  }

  if (responseData && typeof responseData === "object") {
    const entries = Object.entries(responseData);
    const detail = responseData.detail;
    if (typeof detail === "string") {
      return detail;
    }

    const messages = entries.flatMap(([field, value]) => {
      const values = Array.isArray(value) ? value : [value];
      return values.map((message) => {
        const text = typeof message === "string" ? message : JSON.stringify(message);
        return field === "detail" ? text : `${field}: ${text}`;
      });
    });

    if (messages.length) {
      return messages.join(" ");
    }
  }

  return error.message || "Не вдалося завершити запис на курс.";
}

function CourseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [selectedVideo, setSelectedVideo] =
    useState(null);
  const [loading, setLoading] = useState(true);
  const [enrollment, setEnrollment] = useState(null);
  const isAuthenticated = Boolean(localStorage.getItem("accessToken"));
  const [enrollmentLoading, setEnrollmentLoading] = useState(isAuthenticated);
  const [enrollmentBusy, setEnrollmentBusy] = useState(false);
  const [pendingTransaction, setPendingTransaction] = useState(null);
  const [enrollmentError, setEnrollmentError] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [deletingCourse, setDeletingCourse] = useState(false);
  const [courseDeleteError, setCourseDeleteError] = useState("");

  useEffect(() => {
    let active = true;
    api.get(`/courses/${id}/`)
      .then((response) => {
        if (active) setCourse(response.data);
      })
      .catch((error) => {
        console.error("Помилка завантаження курсу", error);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    if (!isAuthenticated) return;

    api.get(`/courses/${id}/enroll/`)
      .then((response) => setEnrollment(response.data))
      .catch((error) => {
        setEnrollmentError(
          error.response?.data?.detail || "Не вдалося перевірити запис на курс.",
        );
      })
      .finally(() => setEnrollmentLoading(false));
  }, [id, isAuthenticated]);

  useEffect(() => {
    let active = true;
    if (!isAuthenticated) {
      setIsAdmin(false);
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
  }, [isAuthenticated]);

  const handleEnroll = async () => {
    setEnrollmentError("");
    setEnrollmentBusy(true);

    try {
      let tx = pendingTransaction;
      if (!tx) {
        tx = await startCourseEnrollment(id);
        setPendingTransaction(tx);
      }

      const proof = await signEnrollment(tx.txHash, tx.account, id);
      const response = await api.post(`/courses/${id}/enroll/`, proof);
      setEnrollment(response.data);
      setPendingTransaction(null);
    } catch (error) {
      setEnrollmentError(getEnrollmentErrorMessage(error));
    } finally {
      setEnrollmentBusy(false);
    }
  };

  const handleDeleteCourse = async () => {
    const confirmed = window.confirm(
      `Видалити курс «${course.title}»? Його матеріали та запис у базі даних буде видалено. Транзакції в блокчейні залишаться незмінними.`,
    );
    if (!confirmed) return;

    setDeletingCourse(true);
    setCourseDeleteError("");
    try {
      await api.delete(`/courses/${id}/`);
      navigate("/");
    } catch (error) {
      setCourseDeleteError(
        error.response?.data?.detail || "Не вдалося видалити курс.",
      );
    } finally {
      setDeletingCourse(false);
    }
  };

  if (loading) {
    return <p>Завантаження...</p>;
  }

  if (!course) {
    return (
      <div className="alert alert-danger">
        Курс не знайдено
      </div>
    );
  }

  return (
    <div>

      <div className="d-flex align-items-start justify-content-between gap-3 mb-3">
        <h1 className="mb-0">{course.title}</h1>
        {isAdmin && (
          <button
            type="button"
            className="btn btn-outline-danger flex-shrink-0"
            onClick={handleDeleteCourse}
            disabled={deletingCourse}
          >
            {deletingCourse ? "Видалення..." : "Видалити курс"}
          </button>
        )}
      </div>

      {courseDeleteError && (
        <div className="alert alert-danger" role="alert">
          {courseDeleteError}
        </div>
      )}

      {course.cover_image && (
        <img
          src={course.cover_image}
          alt={course.title}
          className="img-fluid rounded mb-4"
        />
      )}

      <p className="lead">
        {course.short_description}
      </p>

      <FormattedText className="course-description">
        {course.description}
      </FormattedText>

      <div className="mb-4">
        <strong>Автор:</strong>{" "}
        {course.created_by}
      </div>

      <div className="mb-4">
        <strong>Рівень:</strong>{" "}
        {course.level}
      </div>

      <section className="card mb-4">
        <div className="card-body">
          <h2 className="h5">Запис на курс через блокчейн</h2>
          <p>
            Вартість запису — <strong>0.000001 Sepolia ETH</strong> для кожного курсу,
            плюс комісія мережі.
          </p>
          {enrollment?.enrolled ? (
            <div className="alert alert-success mb-0">
              Ви записані на курс. Транзакція: {" "}
              <a
                href={`https://sepolia.etherscan.io/tx/${enrollment.tx_hash}`}
                target="_blank"
                rel="noreferrer"
              >
                переглянути в Sepolia Etherscan
              </a>
            </div>
          ) : !isAuthenticated ? (
            <p className="mb-0">
              <Link to="/login">Увійдіть</Link>, щоб записатися на курс.
            </p>
          ) : (
            <>
              <p>
                Під’єднайте гаманець Sepolia та підтвердіть оплату в MetaMask.
              </p>
              {enrollmentError && (
                <div className="alert alert-danger" role="alert">
                  {enrollmentError}
                </div>
              )}
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleEnroll}
                disabled={enrollmentBusy || enrollmentLoading}
              >
                {enrollmentBusy
                  ? "Очікуємо підтвердження..."
                  : pendingTransaction
                    ? "Підтвердити запис підписом гаманця"
                    : "Записатися через гаманець"}
              </button>
              {pendingTransaction && (
                <p className="small mt-2 mb-0">
                  Транзакцію підтверджено. Завершіть запис підписом гаманця.
                </p>
              )}
            </>
          )}
        </div>
      </section>

      <h3 className="mb-3">
        Структура курсу
      </h3>

      {course.topics?.length === 0 && (
        <p>Уроків поки немає.</p>
      )}

      {course.topics?.map((topic) => (
        <div
          className="card mb-3"
          key={topic.id}
        >
          <div className="card-body">

            <h5>
              {topic.title}
            </h5>

            <FormattedText>
              {topic.description}
            </FormattedText>

            {topic.videos?.map((video) => (
              <button
                key={video.id}
                className="btn btn-outline-primary me-2 mb-2"
                onClick={() =>
                  setSelectedVideo(video)
                }
              >
                ▶ {video.title}
              </button>
            ))}

          </div>
        </div>
      ))}

      <VideoModal
        video={selectedVideo}
        onClose={() =>
          setSelectedVideo(null)
        }
      />

    </div>
  );
}

export default CourseDetail;
