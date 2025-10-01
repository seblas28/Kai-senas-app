// src/data/signDetails.ts
import imageA from '../assets/vowels/a.png';
import imageE from '../assets/vowels/e.png';
import imageI from '../assets/vowels/i.png';
import imageO from '../assets/vowels/o.png';
import imageU from '../assets/vowels/u.png';

import imageB from '../assets/alphabet/b.png'
import imageC from '../assets/alphabet/c.png'
import imageD from '../assets/alphabet/d.png'
import imageF from '../assets/alphabet/f.png'
import imageG from '../assets/alphabet/g.png'
import imageH from '../assets/alphabet/h.png'
import imageJ from '../assets/alphabet/j.png'
import imageK from '../assets/alphabet/k.png'
import imageL from '../assets/alphabet/l.png'
import imageM from '../assets/alphabet/m.png'
import imageN from '../assets/alphabet/n.png'
import imageP from '../assets/alphabet/p.png'
import imageQ from '../assets/alphabet/q.png'
import imageR from '../assets/alphabet/r.png'
import imageS from '../assets/alphabet/s.png'
import imageT from '../assets/alphabet/t.png'
import imageV from '../assets/alphabet/v.png'
import imageW from '../assets/alphabet/w.png'
import imageX from '../assets/alphabet/x.png'
import imageY from '../assets/alphabet/y.png'
import imageZ from '../assets/alphabet/z.png'

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
import imageEqual from '../assets/math/equal.png';

export interface SignInfo {
  label: string;
  imageSrc: string;
  description: string;
  categories: ('vocales' | 'abecedario' | 'numeros' | 'matematicas')[];
  isTwoHanded?: boolean;
  type?: 'number' | 'operator' | 'equal'; 
}

export const allSignData: SignInfo[] = [
  // Vocales
  { label: 'A', imageSrc: imageA, description: 'Mano cerrada en puño, pulgar al costado.', categories: ['vocales', 'abecedario'], isTwoHanded: false },
  { label: 'E', imageSrc: imageE, description: 'Dedos curvados hacia la palma.', categories: ['vocales', 'abecedario'], isTwoHanded: false },
  { label: 'I', imageSrc: imageI, description: 'Puño cerrado con el meñique extendido.', categories: ['vocales', 'abecedario'], isTwoHanded: false },
  { label: 'O', imageSrc: imageO, description: 'Dedos unidos en forma circular.', categories: ['vocales', 'abecedario'], isTwoHanded: false },
  { label: 'U', imageSrc: imageU, description: 'Índice y medio extendidos juntos.', categories: ['vocales', 'abecedario'], isTwoHanded: false },

  // Abecedario
  { label: 'B', imageSrc: imageB, description: 'Mano abierta, pulgar doblado sobre la palma.', categories: ['abecedario'], isTwoHanded: false },
  { label: 'C', imageSrc: imageC, description: 'Mano en forma de C.', categories: ['abecedario'], isTwoHanded: false },
  { label: 'D', imageSrc: imageD, description: 'Dedo índice extendido, los otros dedos forman un círculo con el pulgar.', categories: ['abecedario'], isTwoHanded: false },
  { label: 'F', imageSrc: imageF, description: 'Índice y pulgar se tocan, los otros tres dedos extendidos.', categories: ['abecedario'], isTwoHanded: false },
  { label: 'G', imageSrc: imageG, description: 'Puño cerrado, índice y pulgar extendidos paralelamente.', categories: ['abecedario'], isTwoHanded: false },
  { label: 'H', imageSrc: imageH, description: 'Puño cerrado, índice y medio extendidos juntos.', categories: ['abecedario'], isTwoHanded: false },
  { label: 'J', imageSrc: imageJ, description: 'Dedo meñique extendido dibujando una "J" en el aire.', categories: ['abecedario'], isTwoHanded: false },
  { label: 'K', imageSrc: imageK, description: 'Índice y medio extendidos, pulgar entre ellos.', categories: ['abecedario'], isTwoHanded: false },
  { label: 'L', imageSrc: imageL, description: 'Pulgar e índice extendidos formando una "L".', categories: ['abecedario'], isTwoHanded: false },
  { label: 'M', imageSrc: imageM, description: 'Pulgar debajo de los dedos índice, medio y anular.', categories: ['abecedario'], isTwoHanded: false },
  { label: 'N', imageSrc: imageN, description: 'Pulgar debajo de los dedos índice y medio.', categories: ['abecedario'], isTwoHanded: false },
  { label: 'P', imageSrc: imageP, description: 'Misma seña que la "K", pero apuntando hacia abajo.', categories: ['abecedario'], isTwoHanded: false },
  { label: 'Q', imageSrc: imageQ, description: 'Índice y pulgar hacia abajo, como pellizcando.', categories: ['abecedario'], isTwoHanded: false },
  { label: 'R', imageSrc: imageR, description: 'Dedos índice y medio cruzados.', categories: ['abecedario'], isTwoHanded: false },
  { label: 'S', imageSrc: imageS, description: 'Puño cerrado con el pulgar sobre los otros dedos.', categories: ['abecedario'], isTwoHanded: false },
  { label: 'T', imageSrc: imageT, description: 'Puño cerrado, pulgar entre el índice y el medio.', categories: ['abecedario'], isTwoHanded: false },
  { label: 'V', imageSrc: imageV, description: 'Dedos índice y medio extendidos en forma de "V".', categories: ['abecedario'], isTwoHanded: false },
  { label: 'W', imageSrc: imageW, description: 'Dedos índice, medio y anular extendidos.', categories: ['abecedario'], isTwoHanded: false },
  { label: 'X', imageSrc: imageX, description: 'Dedo índice doblado en forma de gancho.', categories: ['abecedario'], isTwoHanded: false },
  { label: 'Y', imageSrc: imageY, description: 'Pulgar y meñique extendidos.', categories: ['abecedario'], isTwoHanded: false},
  { label: 'Z', imageSrc: imageZ, description: 'Dedo índice dibujando una "Z" en el aire.', categories: ['abecedario'], isTwoHanded: false },

  // Números
  { label: '1', imageSrc: image1, description: 'Dedo índice extendido.', categories: ['numeros'], isTwoHanded: false, type: 'number' },
  { label: '2', imageSrc: image2, description: 'Índice y medio extendidos.', categories: ['numeros'], isTwoHanded: false, type: 'number' },
  { label: '3', imageSrc: image3, description: 'Índice, medio y pulgar extendidos.', categories: ['numeros'], isTwoHanded: false, type: 'number' },
  { label: '4', imageSrc: image4, description: 'Cuatro dedos extendidos, pulgar doblado.', categories: ['numeros'], isTwoHanded: false, type: 'number' },
  { label: '5', imageSrc: image5, description: 'Mano abierta con todos los dedos extendidos.', categories: ['numeros'], isTwoHanded: false, type: 'number' },
  { label: '6', imageSrc: image6, description: 'Pulgar y meñique tocándose.', categories: ['numeros'], isTwoHanded: false, type: 'number' },
  { label: '7', imageSrc: image7, description: 'Pulgar, índice y medio extendidos.', categories: ['numeros'], isTwoHanded: false, type: 'number' },
  { label: '8', imageSrc: image8, description: 'Índice, medio y anular extendidos.', categories: ['numeros'], isTwoHanded: false, type: 'number' },
  { label: '9', imageSrc: image9, description: 'Índice y medio formando un círculo.', categories: ['numeros'], isTwoHanded: false, type: 'number' },
  { label: '10', imageSrc: image10, description: 'Dedo pulgar levantado.', categories: ['numeros'], isTwoHanded: false, type: 'number' },

  // Operaciones Matemáticas
  { label: 'Suma', imageSrc: imagePlus, description: 'Seña para la operación de suma.', categories: ['matematicas'], isTwoHanded: true, type: 'operator' },
  { label: 'Resta', imageSrc: imageMinus, description: 'Seña para la operación de resta.', categories: ['matematicas'], isTwoHanded: true, type: 'operator' },
  { label: 'Igual', imageSrc: imageEqual, description: 'Seña para el signo igual.', categories: ['matematicas'], isTwoHanded: true, type: 'operator' },
];

export const signTypeMap = new Map<string, 'number' | 'operator' | 'equal'>();
allSignData.forEach(sign => {
  if (sign.type) {
    signTypeMap.set(sign.label, sign.type);
  }
});