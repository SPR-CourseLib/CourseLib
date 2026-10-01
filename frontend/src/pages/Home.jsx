import { useEffect, useState } from "react";
import api from "../api/axios";
import CourseCard from "../components/CourseCard";
import CategoryFilter from "../components/CategoryFilter";
import "./Home.css";

function Home() {
  const [courses, setCourses] = useState([]);
  const [selectedCategory, setSelectedCategory] =
    useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      const response = await api.get("/courses/");

      setCourses(response.data);
    } catch (error) {
      console.error(error);
      setError("Не вдалося завантажити курси");
    } finally {
      setLoading(false);
    }
  };

 const categories = [
  ...new Set(
    courses
      .map(
        (course) =>
          course.category?.name ||
          course.category
      )
      .filter(Boolean)
  ),
];

  const filteredCourses =
  selectedCategory === "all"
    ? courses
    : courses.filter((course) => {
        const category =
          course.category?.name ||
          course.category;

        return category === selectedCategory;
      });
if (loading) {
  return (
    <div className="text-center py-5">
      Завантаження курсів...
    </div>
  );
}

if (error) {
  return (
    <div className="alert alert-danger">
      {error}
    </div>
  );
}
  return (
    <>
      <section className="hero-section mb-5">
       <div className="hero-content">
         <h1 className="hero-title">
      Бібліотека курсів
         </h1>

    <p className="hero-text">
      Платформа для навчання та перегляду курсів.
    </p>

    <a href="#courses" className="btn btn-primary btn-lg">
      Переглянути курси
    </a>
      </div>
     </section>

      <section id="courses">
        <h2 className="mb-4">
          Каталог курсів
        </h2>

        <CategoryFilter
          categories={categories}
          selectedCategory={selectedCategory}
          onSelect={setSelectedCategory}
        />

        <div className="row">
          {filteredCourses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
            />
          ))}
        </div>
      </section>

      <section className="bg-light rounded p-5 my-5 text-center">
        <h2>Навчайся у зручному форматі</h2>

        <p className="text-muted">
          Переглядай матеріали, відео та завантажуй
          доступні навчальні ресурси.
        </p>
      </section>

      <section className="text-center my-5">
        <h3>Ми у соціальних мережах</h3>

        <div className="d-flex justify-content-center gap-3 mt-3">
          <button className="btn btn-outline-danger">
            YouTube
          </button>

          <button className="btn btn-outline-primary">
            Telegram
          </button>

          <button className="btn btn-outline-dark">
            Instagram
          </button>
        </div>
      </section>

      <section className="border-top pt-4 mb-4">
        <h3>Контакти</h3>
        <p>Email: support@courselib.com</p>
      </section>
    </>
  );
}

export default Home;