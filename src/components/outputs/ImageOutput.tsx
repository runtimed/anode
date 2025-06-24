import React, { useState } from "react";
import { X, ZoomIn } from "lucide-react";

interface ImageOutputProps {
  src: string;
  alt?: string;
  mediaType: "image/png" | "image/jpeg";
}

interface ZoomModalProps {
  src: string;
  onClose: () => void;
}

const ZoomModal: React.FC<ZoomModalProps> = ({ src, onClose }) => (
  <div
    className="zoom-modal fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
    onClick={onClose}
  >
    <div className="relative max-w-full max-h-full">
      <button
        onClick={onClose}
        className="absolute top-2 right-2 z-10 bg-black bg-opacity-50 text-white rounded-full p-2 hover:bg-opacity-70"
      >
        <X className="h-4 w-4" />
      </button>
      <img
        src={src}
        alt="Zoomed view"
        className="max-w-full max-h-full object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  </div>
);

export const ImageOutput: React.FC<ImageOutputProps> = ({
  src,
  alt = "Output image",
  mediaType,
}) => {
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  const imageSrc = src.startsWith("data:")
    ? src
    : `data:${mediaType};base64,${src}`;

  return (
    <div className="py-2">
      <div className="relative group max-w-full">
        <img
          src={imageSrc}
          alt={alt}
          className="zoomable-image max-w-full h-auto cursor-zoom-in hover:opacity-90 transition-opacity"
          style={{ maxHeight: "400px", objectFit: "contain" }}
          onClick={() => setZoomedImage(imageSrc)}
        />
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black bg-opacity-50 text-white rounded p-1">
          <ZoomIn className="h-3 w-3" />
        </div>
      </div>

      {zoomedImage && (
        <ZoomModal
          src={zoomedImage}
          onClose={() => setZoomedImage(null)}
        />
      )}
    </div>
  );
};

export default ImageOutput;
