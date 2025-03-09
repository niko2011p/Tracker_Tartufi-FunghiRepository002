export interface Species {
  scientificName: string;
  commonName: string;
  type: 'Fungo' | 'Tartufo';
}

export const species: Species[] = [
  // Funghi commestibili
  {
    scientificName: 'Agaricus bisporus',
    commonName: 'Champignon',
    type: 'Fungo'
  },
  {
    scientificName: 'Amanita caesarea',
    commonName: 'Ovolo buono',
    type: 'Fungo'
  },
  {
    scientificName: 'Armillaria mellea',
    commonName: 'Chiodino',
    type: 'Fungo'
  },
  {
    scientificName: 'Boletus edulis',
    commonName: 'Porcino',
    type: 'Fungo'
  },
  {
    scientificName: 'Boletus aereus',
    commonName: 'Porcino nero',
    type: 'Fungo'
  },
  {
    scientificName: 'Boletus pinophilus',
    commonName: 'Porcino rosso',
    type: 'Fungo'
  },
  {
    scientificName: 'Boletus reticulatus',
    commonName: 'Porcino estivo',
    type: 'Fungo'
  },
  {
    scientificName: 'Cantharellus cibarius',
    commonName: 'Finferlo',
    type: 'Fungo'
  },
  {
    scientificName: 'Craterellus cornucopioides',
    commonName: 'Trombetta dei morti',
    type: 'Fungo'
  },
  {
    scientificName: 'Hydnum repandum',
    commonName: 'Steccherino dorato',
    type: 'Fungo'
  },
  {
    scientificName: 'Lactarius deliciosus',
    commonName: 'Sanguinello',
    type: 'Fungo'
  },
  {
    scientificName: 'Macrolepiota procera',
    commonName: 'Mazza di tamburo',
    type: 'Fungo'
  },
  {
    scientificName: 'Morchella esculenta',
    commonName: 'Spugnola',
    type: 'Fungo'
  },
  {
    scientificName: 'Pleurotus ostreatus',
    commonName: 'Gelone',
    type: 'Fungo'
  },
  {
    scientificName: 'Russula virescens',
    commonName: 'Colombina verde',
    type: 'Fungo'
  },
  // Tartufi
  {
    scientificName: 'Tuber magnatum',
    commonName: 'Tartufo bianco pregiato',
    type: 'Tartufo'
  },
  {
    scientificName: 'Tuber melanosporum',
    commonName: 'Tartufo nero pregiato',
    type: 'Tartufo'
  },
  {
    scientificName: 'Tuber aestivum',
    commonName: 'Tartufo estivo',
    type: 'Tartufo'
  },
  {
    scientificName: 'Tuber borchii',
    commonName: 'Tartufo bianchetto',
    type: 'Tartufo'
  },
  {
    scientificName: 'Tuber brumale',
    commonName: 'Tartufo nero invernale',
    type: 'Tartufo'
  },
  {
    scientificName: 'Tuber mesentericum',
    commonName: 'Tartufo nero ordinario',
    type: 'Tartufo'
  },
  {
    scientificName: 'Tuber macrosporum',
    commonName: 'Tartufo nero liscio',
    type: 'Tartufo'
  }
];