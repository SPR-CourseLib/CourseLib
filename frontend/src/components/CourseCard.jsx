import { Link } from "react-router-dom";

function CourseCard({ course }) {
  return (
    <div className="col-md-6 col-lg-4 mb-4">
      <div className="card h-100 shadow-sm">
        <img
          src={course.image}
          className="card-img-top"
          alt={course.title}
        />

        <div className="card-body d-flex flex-column">
          <span className="badge bg-primary mb-2 align-self-start">
            {course.category}
          </span>

          <h5 className="card-title">
            {course.title}
          </h5>

          <p className="card-text">
            {course.description}
          </p>

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