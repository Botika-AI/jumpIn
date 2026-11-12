import React from 'react';

interface Props {
  src: string;
  alt: string;
}

/**
 * Copertina mostrata sempre intera (nessun taglio), qualunque sia il formato.
 * Lo spazio libero nel riquadro viene riempito da una copia sfocata della stessa immagine.
 * Il contenitore padre deve avere dimensioni definite (es. aspect-video) e overflow-hidden.
 */
export const CoverImage: React.FC<Props> = ({ src, alt }) => (
  <div className="relative w-full h-full">
    <img src={src} alt="" aria-hidden="true"
      className="absolute inset-0 w-full h-full object-cover scale-110 blur-xl opacity-60" />
    <img src={src} alt={alt} className="relative w-full h-full object-contain" />
  </div>
);
