function CategoryFilter({
  categories,
  selectedCategory,
  onSelect,
}) {
  return (
    <div className="mb-4">
      <button
        className={`btn me-2 mb-2 ${
          selectedCategory === "all"
            ? "btn-primary"
            : "btn-outline-primary"
        }`}
        onClick={() => onSelect("all")}
      >
        Усі
      </button>

      {categories.map((category) => (
        <button
          key={category}
          className={`btn me-2 mb-2 ${
            selectedCategory === category
              ? "btn-primary"
              : "btn-outline-primary"
          }`}
          onClick={() => onSelect(category)}
        >
          {category}
        </button>
      ))}
    </div>
  );
}

export default CategoryFilter;