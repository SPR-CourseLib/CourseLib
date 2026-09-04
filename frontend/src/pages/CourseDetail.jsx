import { useParams } from "react-router-dom";

function CourseDetail() {
  const { id } = useParams();

  return (
    <div>
      <h1>Інформація про курс</h1>
      <p>ID курсу: {id}</p>
    </div>
  );
}

export default CourseDetail;