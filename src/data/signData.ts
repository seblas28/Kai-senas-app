// src/data/signData.ts
import { SignInfo, allSignData, signTypeMap} from './signDetails';
import categoryVowelsImg from '../assets/categories/vocales.png';
import categoryNumbersImg from '../assets/categories/numeros.png';
import categoryMathImg from '../assets/categories/matematicas.png';
import categoryAlphabet from '../assets/categories/abecedario.png';


// Interfaz para la información de cada categoría
export interface CategoryInfo {
  id: 'vocales' | 'abecedario' | 'numeros' | 'matematicas';
  title: string;
  imageSrc: string;
  tag?: string;
}

// Array con la información de las categorías para la página principal
export const categoryData: CategoryInfo[] = [
  { id: 'vocales', title: 'Vocales', imageSrc: categoryVowelsImg },
  { id: 'abecedario', title: 'Abecedario', imageSrc:categoryAlphabet },
  { id: 'numeros', title: 'Números', imageSrc: categoryNumbersImg },
  { id: 'matematicas', title: 'Matemáticas', imageSrc: categoryMathImg, tag: 'Alpha' },
];

export const getSignsByCategory = (category: string): SignInfo[] => {
  const signs = allSignData.filter(sign => sign.categories.includes(category as any));
  // Ordenamiento alfabético y numérico
  if (category === 'abecedario' || category === 'vocales') {
      return signs.sort((a, b) => a.label.localeCompare(b.label));
  }
  if (category === 'numeros') {
      return signs.sort((a, b) => parseInt(a.label) - parseInt(b.label));
  }
  return signs;
};

export const getSignsForTraining = (category: string): SignInfo[] => {
    const signs = getSignsByCategory(category);
    if (category === 'abecedario') {
        const vowels = ['A', 'E', 'I', 'O', 'U'];
        return signs.filter(sign => !vowels.includes(sign.label));
    }
    return signs;
};

export { allSignData, signTypeMap, type SignInfo};
