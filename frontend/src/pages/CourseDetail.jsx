import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api/axios";
import VideoModal from "../components/VideoModal";

function CourseDetail() {
  const { id } = useParams();

  const [course, setCourse] = useState(null);
  const [selectedVideo, setSelectedVideo] =
    useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCourse();
  }, [id]);

  const loadCourse = async () => {
    try {
      const response = await api.get(
        `/courses/${id}/`
      );

      setCourse(response.data);
    } catch (error) {
      console.error(
        "Помилка завантаження курсу",
        error
      );
    } finally {
      setLoading(false);
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

      <h1 className="mb-3">
        {course.title}
      </h1>

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

      <p>
        {course.description}
      </p>

      <div className="mb-4">
        <strong>Автор:</strong>{" "}
        {course.created_by}
      </div>

      <div className="mb-4">
        <strong>Рівень:</strong>{" "}
        {course.level}
      </div>

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

            <p>
              {topic.description}
            </p>

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