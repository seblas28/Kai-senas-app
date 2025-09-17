// src/data/vowelData.ts

// Importamos las imágenes para que Vite las procese correctamente
import imageA from '../assets/vowels/a.png';
import imageE from '../assets/vowels/e.png';
import imageI from '../assets/vowels/i.png';
import imageO from '../assets/vowels/o.png';
import imageU from '../assets/vowels/u.png';

// Creamos un tipo para definir la estructura de nuestros datos
export interface VowelInfo {
  vowel: string;
  imageSrc: string;
  description: string;
}

// El array con toda la información, listo para ser importado
export const vowelData: VowelInfo[] = [
  {
    vowel: 'A',
    imageSrc: imageA,
    description: 'Mano cerrada en puño, pulgar al costado.',
  },
  {
    vowel: 'E',
    imageSrc: imageE,
    description: 'Dedos curvados hacia la palma, como formando una E.',
  },
  {
    vowel: 'I',
    imageSrc: imageI,
    description: 'Puño cerrado con el meñique extendido.',
  },
  {
    vowel: 'O',
    imageSrc: imageO,
    description: 'Dedos unidos en forma circular.',
  },
  {
    vowel: 'U',
    imageSrc: imageU,
    description: 'Índice y medio extendidos juntos en forma de U.',
  },
];