import { useState } from "react";
import CourseCard from "../components/CourseCard";
import CategoryFilter from "../components/CategoryFilter";
import "./Home.css";

function Home() {
  const [selectedCategory, setSelectedCategory] =
    useState("all");

  const courses = [
    {
      id: 1,
      title: "React для початківців",
      description: "Основи React та компонентного підходу.",
      category: "Програмування",
      image: "https://via.placeholder.com/600x300",
    },
    {
      id: 2,
      title: "Основи дизайну",
      description: "UI/UX та базові принципи дизайну.",
      category: "Дизайн",
      image: "https://via.placeholder.com/600x300",
    },
    {
      id: 3,
      title: "Digital Marketing",
      description: "Основи просування у цифрових каналах.",
      category: "Маркетинг",
      image: "https://via.placeholder.com/600x300",
    },
  ];

  const categories = [
    ...new Set(courses.map((course) => course.category)),
  ];

  const filteredCourses =
    selectedCategory === "all"
      ? courses
      : courses.filter(
          (course) =>
            course.category === selectedCategory
        );

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