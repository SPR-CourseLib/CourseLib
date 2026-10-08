import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

function CreateCourse() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: "",
    short_description: "",
    description: "",
    level: "beginner",
    price: 0,
    is_published: true,
  });

  const [topics, setTopics] = useState([
    {
      title: "",
      description: "",
      videos: [
        {
          title: "",
          description: "",
          video_url: "",
        },
      ],
    },
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [coverImage, setCoverImage] = useState(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState("");
  const coverPreviewUrlRef = useRef("");

  useEffect(() => {
    return () => {
      if (coverPreviewUrlRef.current) {
        URL.revokeObjectURL(coverPreviewUrlRef.current);
      }
    };
  }, []);

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleCoverImageChange = (e) => {
    const selectedFile = e.target.files?.[0] || null;
    const clearCurrentImage = () => {
      if (coverPreviewUrlRef.current) {
        URL.revokeObjectURL(coverPreviewUrlRef.current);
        coverPreviewUrlRef.current = "";
      }
      setCoverPreviewUrl("");
      setCoverImage(null);
    };

    if (!selectedFile) {
      clearCurrentImage();
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(selectedFile.type)) {
      setError("Оберіть зображення у форматі JPG, PNG або WebP.");
      e.target.value = "";
      clearCurrentImage();
      return;
    }
    if (selectedFile.size > 5 * 1024 * 1024) {
      setError("Розмір обкладинки не має перевищувати 5 МБ.");
      e.target.value = "";
      clearCurrentImage();
      return;
    }

    clearCurrentImage();
    const previewUrl = URL.createObjectURL(selectedFile);
    coverPreviewUrlRef.current = previewUrl;
    setCoverPreviewUrl(previewUrl);
    setError("");
    setCoverImage(selectedFile);
  };

  const handleTopicChange = (topicIndex, field, value) => {
    const updatedTopics = [...topics];
    updatedTopics[topicIndex][field] = value;
    setTopics(updatedTopics);
  };

  const handleVideoChange = (
    topicIndex,
    videoIndex,
    field,
    value
  ) => {
    const updatedTopics = [...topics];

    updatedTopics[topicIndex].videos[videoIndex][field] =
      value;

    setTopics(updatedTopics);
  };

  const addTopic = () => {
    setTopics((prev) => [
      ...prev,
      {
        title: "",
        description: "",
        videos: [
          {
            title: "",
            description: "",
            video_url: "",
          },
        ],
      },
    ]);
  };

  const removeTopic = (topicIndex) => {
    setTopics((prev) =>
      prev.filter((_, index) => index !== topicIndex)
    );
  };

  const addVideo = (topicIndex) => {
    const updatedTopics = [...topics];

    updatedTopics[topicIndex].videos.push({
      title: "",
      description: "",
      video_url: "",
    });

    setTopics(updatedTopics);
  };

  const removeVideo = (topicIndex, videoIndex) => {
    const updatedTopics = [...topics];

    updatedTopics[topicIndex].videos =
      updatedTopics[topicIndex].videos.filter(
        (_, index) => index !== videoIndex
      );

    setTopics(updatedTopics);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setError("");

    try {
      const courseData = new FormData();
      courseData.append("title", form.title);
      courseData.append("short_description", form.short_description);
      courseData.append("description", form.description);
      courseData.append("level", form.level);
      courseData.append("price", String(Number(form.price)));
      courseData.append("is_published", String(form.is_published));
      if (coverImage) courseData.append("cover_image", coverImage);

      // Create the course and upload its optional cover in the same request.
      const courseResponse = await api.post("/courses/", courseData);

      const courseId = courseResponse.data.id;

      // 2. Створюємо розділи
      for (let i = 0; i < topics.length; i++) {
        const topic = topics[i];

        const topicResponse = await api.post(
          `/courses/${courseId}/topics/`,
          {
            title: topic.title,
            description: topic.description,
            order: i + 1,
          }
        );

        const topicId = topicResponse.data.id;

        // 3. Створюємо відео в кожному розділі
        for (let j = 0; j < topic.videos.length; j++) {
          const video = topic.videos[j];

          await api.post(
            `/topics/${topicId}/videos/`,
            {
              title: video.title,
              description: video.description,
              video_url: video.video_url,
              order: j + 1,
            }
          );
        }
      }

      navigate(`/course/${courseId}`);
    } catch (err) {
      console.error(err);

      if (err.response?.status === 401) {
        setError(
          "Потрібно увійти в акаунт перед створенням курсу."
        );
      } else if (err.response?.status === 403) {
        setError("Створювати курси можуть лише адміністратори.");
      } else {
        const imageError = err.response?.data?.cover_image;
        const detail = err.response?.data?.detail;
        setError(
          (Array.isArray(imageError) && imageError[0]) ||
          (typeof detail === "string" && detail) ||
          "Не вдалося створити курс. Перевірте дані та файл обкладинки.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-4">
      <div className="mb-4">
        <h1>Створення курсу</h1>
        <p className="text-muted">
          Додайте основну інформацію, розділи та відеоуроки.
        </p>
      </div>

      {error && (
        <div className="alert alert-danger">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="card shadow-sm mb-4">
          <div className="card-body">
            <h4 className="mb-3">
              Основна інформація
            </h4>

            <div className="mb-3">
              <label className="form-label">
                Назва курсу
              </label>

              <input
                type="text"
                className="form-control"
                name="title"
                value={form.title}
                onChange={handleFormChange}
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label">
                Короткий опис
              </label>

              <input
                type="text"
                className="form-control"
                name="short_description"
                value={form.short_description}
                onChange={handleFormChange}
                maxLength="255"
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label">
                Повний опис
              </label>

              <textarea
                className="form-control"
                rows="5"
                name="description"
                value={form.description}
                onChange={handleFormChange}
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label" htmlFor="cover_image">
                Обкладинка курсу (необов’язково)
              </label>
              <input
                id="cover_image"
                type="file"
                className="form-control"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleCoverImageChange}
              />
              <div className="form-text">
                JPG, PNG або WebP, до 5 МБ.
              </div>
              {coverPreviewUrl && (
                <img
                  src={coverPreviewUrl}
                  alt="Попередній перегляд обкладинки"
                  className="img-fluid rounded mt-3"
                  style={{ maxHeight: "260px" }}
                />
              )}
            </div>

            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label">
                  Рівень
                </label>

                <select
                  className="form-select"
                  name="level"
                  value={form.level}
                  onChange={handleFormChange}
                >
                  <option value="beginner">
                    Початковий
                  </option>

                  <option value="intermediate">
                    Середній
                  </option>

                  <option value="advanced">
                    Просунутий
                  </option>
                </select>
              </div>

              <div className="col-md-6 mb-3">
                <label className="form-label">
                  Ціна
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="form-control"
                  name="price"
                  value={form.price}
                  onChange={handleFormChange}
                />
              </div>
            </div>

            <div className="form-check">
              <input
                type="checkbox"
                className="form-check-input"
                id="is_published"
                name="is_published"
                checked={form.is_published}
                onChange={handleFormChange}
              />

              <label
                className="form-check-label"
                htmlFor="is_published"
              >
                Опублікувати курс
              </label>
            </div>
          </div>
        </div>

        <h3 className="mb-3">
          Структура курсу
        </h3>

        {topics.map((topic, topicIndex) => (
          <div
            className="card shadow-sm mb-4"
            key={topicIndex}
          >
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="mb-0">
                  Розділ {topicIndex + 1}
                </h5>

                {topics.length > 1 && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger"
                    onClick={() =>
                      removeTopic(topicIndex)
                    }
                  >
                    Видалити розділ
                  </button>
                )}
              </div>

              <div className="mb-3">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Назва розділу"
                  value={topic.title}
                  onChange={(e) =>
                    handleTopicChange(
                      topicIndex,
                      "title",
                      e.target.value
                    )
                  }
                  required
                />
              </div>

              <div className="mb-3">
                <textarea
                  className="form-control"
                  placeholder="Опис розділу"
                  value={topic.description}
                  onChange={(e) =>
                    handleTopicChange(
                      topicIndex,
                      "description",
                      e.target.value
                    )
                  }
                />
              </div>

              <h6 className="mb-3">
                Відеоуроки
              </h6>

              {topic.videos.map(
                (video, videoIndex) => (
                  <div
                    className="border rounded p-3 mb-3"
                    key={videoIndex}
                  >
                    <div className="d-flex justify-content-between mb-2">
                      <strong>
                        Урок {videoIndex + 1}
                      </strong>

                      {topic.videos.length > 1 && (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() =>
                            removeVideo(
                              topicIndex,
                              videoIndex
                            )
                          }
                        >
                          Видалити
                        </button>
                      )}
                    </div>

                    <input
                      type="text"
                      className="form-control mb-2"
                      placeholder="Назва відеоуроку"
                      value={video.title}
                      onChange={(e) =>
                        handleVideoChange(
                          topicIndex,
                          videoIndex,
                          "title",
                          e.target.value
                        )
                      }
                      required
                    />

                    <input
                      type="url"
                      className="form-control mb-2"
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={video.video_url}
                      onChange={(e) =>
                        handleVideoChange(
                          topicIndex,
                          videoIndex,
                          "video_url",
                          e.target.value
                        )
                      }
                      required
                    />

                    <textarea
                      className="form-control"
                      placeholder="Опис уроку або посилання на літературу"
                      value={video.description}
                      onChange={(e) =>
                        handleVideoChange(
                          topicIndex,
                          videoIndex,
                          "description",
                          e.target.value
                        )
                      }
                    />
                  </div>
                )
              )}

              <button
                type="button"
                className="btn btn-outline-primary"
                onClick={() => addVideo(topicIndex)}
              >
                + Додати відеоурок
              </button>
            </div>
          </div>
        ))}

        <div className="d-flex gap-2 mb-4">
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={addTopic}
          >
            + Додати розділ
          </button>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading
              ? "Створення..."
              : "Створити курс"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default CreateCourse;
