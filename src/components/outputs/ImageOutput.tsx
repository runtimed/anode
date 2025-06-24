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
    className="zoom-modal bg-opacity-75 fixed inset-0 z-50 flex items-center justify-center bg-black p-4"
    onClick={onClose}
  >
    <div className="relative max-h-full max-w-full">
      <button
        onClick={onClose}
        className="bg-opacity-50 hover:bg-opacity-70 absolute top-2 right-2 z-10 rounded-full bg-black p-2 text-white"
      >
        <X className="h-4 w-4" />
      </button>
      <img
        src={src}
        alt="Zoomed view"
        className="max-h-full max-w-full object-contain"
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
      <div className="group relative max-w-full">
        <img
          src={imageSrc}
          alt={alt}
          className="zoomable-image h-auto max-w-full cursor-zoom-in transition-opacity hover:opacity-90"
          style={{ maxHeight: "400px", objectFit: "contain" }}
          onClick={() => setZoomedImage(imageSrc)}
        />
        <div className="bg-opacity-50 absolute top-2 right-2 rounded bg-black p-1 text-white opacity-0 transition-opacity group-hover:opacity-100">
          <ZoomIn className="h-3 w-3" />
        </div>
      </div>

      {zoomedImage && (
        <ZoomModal src={zoomedImage} onClose={() => setZoomedImage(null)} />
      )}
    </div>
  );
};

export default ImageOutput;
