import { Link } from "react-router-dom";

function CourseCard({ course }) {
  const category =
    course.category?.name ||
    course.category ||
    "Без категорії";

  return (
    <div className="col-md-6 col-lg-4 mb-4">
      <div className="card h-100 shadow-sm course-card">

        {course.cover_image && (
          <img
            src={course.cover_image}
            className="card-img-top"
            alt={course.title}
          />
        )}

        <div className="card-body d-flex flex-column">

          <span className="badge bg-primary mb-2 align-self-start">
            {category}
          </span>

          <h5 className="card-title">
            {course.title}
          </h5>

          <p className="card-text">
            {course.short_description}
          </p>

          <div className="small text-muted mb-3">
            Рівень: {course.level}
          </div>

          <Link
            to={`/course/${course.id}`}
            className="btn btn-outline-primary mt-auto"
          >
            Переглянути курс
          </Link>

        </div>
      </div>
    </div>
  );
}

export default CourseCard;