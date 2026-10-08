import ReactPlayer from "react-player";
import FormattedText, { extractExternalUrl } from "./FormattedText";

function VideoModal({ video, onClose }) {
  if (!video) {
    return null;
  }

  const videoUrl = extractExternalUrl(video.video_url);

  return (
    <div
      className="modal d-block"
      tabIndex="-1"
      style={{
        backgroundColor:
          "rgba(0, 0, 0, 0.7)",
      }}
    >
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <div className="modal-content">

          <div className="modal-header">

            <h5 className="modal-title">
              {video.title}
            </h5>

            <button
              className="btn-close"
              onClick={onClose}
            />

          </div>

          <div className="modal-body">
            {videoUrl ? (
              <div className="ratio ratio-16x9">
                <ReactPlayer
                  src={videoUrl}
                  controls
                  width="100%"
                  height="100%"
                />
              </div>
            ) : (
              <div className="alert alert-warning mb-0">
                Для цього уроку не вказано коректне посилання на відео.
              </div>
            )}

            {video.description && (
              <FormattedText className="mt-3 mb-0">
                {video.description}
              </FormattedText>
            )}

          </div>

        </div>
      </div>
    </div>
  );
}

export default VideoModal;
