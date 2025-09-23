// src/data/signData.ts

// Importa todas las imágenes que usarás en la aplicación
import imageA from '../assets/vowels/a.png';
import imageE from '../assets/vowels/e.png';
import imageI from '../assets/vowels/i.png';
import imageO from '../assets/vowels/o.png';
import imageU from '../assets/vowels/u.png';

import image1 from '../assets/numbers/1.png';
import image2 from '../assets/numbers/2.png';
import image3 from '../assets/numbers/3.png';
import image4 from '../assets/numbers/4.png';
import image5 from '../assets/numbers/5.png';
import image6 from '../assets/numbers/6.png';
import image7 from '../assets/numbers/7.png';
import image8 from '../assets/numbers/8.png';
import image9 from '../assets/numbers/9.png';
import image10 from '../assets/numbers/10.png';

import imagePlus from '../assets/math/plus.png';
import imageMinus from '../assets/math/minus.png';

import categoryVowelsImg from '../assets/categories/vocales.png';
import categoryNumbersImg from '../assets/categories/numeros.png';
import categoryMathImg from '../assets/categories/matematicas.png';

export interface SignInfo {
  label: string;
  imageSrc: string;
  description: string;
  category: 'vocales' | 'numeros' | 'matematicas';
}

// Interfaz para la información de cada categoría
export interface CategoryInfo {
  id: 'vocales' | 'numeros' | 'matematicas';
  title: string;
  imageSrc: string;
}

// Array con la información de las categorías para la página principal
export const categoryData: CategoryInfo[] = [
  { id: 'vocales', title: 'Vocales', imageSrc: categoryVowelsImg },
  { id: 'numeros', title: 'Números', imageSrc: categoryNumbersImg },
  { id: 'matematicas', title: 'Matemáticas', imageSrc: categoryMathImg },
];


// Un único array con TODAS las señas.
export const allSignData: SignInfo[] = [
  // Vocales
  { label: 'A', imageSrc: imageA, description: 'Mano cerrada en puño, pulgar al costado.', category: 'vocales' },
  { label: 'E', imageSrc: imageE, description: 'Dedos curvados hacia la palma.', category: 'vocales' },
  { label: 'I', imageSrc: imageI, description: 'Puño cerrado con el meñique extendido.', category: 'vocales' },
  { label: 'O', imageSrc: imageO, description: 'Dedos unidos en forma circular.', category: 'vocales' },
  { label: 'U', imageSrc: imageU, description: 'Índice y medio extendidos juntos.', category: 'vocales' },

  // Números
  { label: '1', imageSrc: image1, description: 'Dedo índice extendido.', category: 'numeros' },
  { label: '2', imageSrc: image2, description: 'Índice y medio extendidos.', category: 'numeros' },
  { label: '3', imageSrc: image3, description: 'Índice, medio y pulgar extendidos.', category: 'numeros' },
  { label: '4', imageSrc: image4, description: 'Cuatro dedos extendidos, pulgar doblado.', category: 'numeros' },
  { label: '5', imageSrc: image5, description: 'Mano abierta con todos los dedos extendidos.', category: 'numeros' },
  { label: '6', imageSrc: image6, description: 'Pulgar y meñique tocándose.', category: 'numeros' },
  { label: '7', imageSrc: image7, description: 'Pulgar, índice y medio extendidos.', category: 'numeros' },
  { label: '8', imageSrc: image8, description: 'Índice, medio y anular extendidos.', category: 'numeros' },
  { label: '9', imageSrc: image9, description: 'Índice y medio formando un círculo.', category: 'numeros' },
  { label: '10', imageSrc: image10, description: 'Dedo pulgar levantado.', category: 'numeros' },

  // Operaciones Matemáticas
  { label: 'Suma', imageSrc: imagePlus, description: 'Seña para la operación de suma.', category: 'matematicas' },
  { label: 'Resta', imageSrc: imageMinus, description: 'Seña para la operación de resta.', category: 'matematicas' },
];

export const getSignsByCategory = (category: string): SignInfo[] => {
  return allSignData.filter(sign => sign.category === category);
};

