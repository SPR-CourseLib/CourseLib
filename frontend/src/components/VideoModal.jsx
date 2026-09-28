import ReactPlayer from "react-player";

function VideoModal({ video, onClose }) {
  if (!video) {
    return null;
  }

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

            <ReactPlayer
              src={video.video_url}
              controls
              width="100%"
              height="450px"
            />

            {video.description && (
              <p className="mt-3">
                {video.description}
              </p>
            )}

          </div>

        </div>
      </div>
    </div>
  );
}

export default VideoModal;