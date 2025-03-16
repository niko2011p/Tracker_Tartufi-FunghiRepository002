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
  {
    scientificName: 'Agaricus campestris',
    commonName: 'Prataiolo',
    type: 'Fungo'
  },
  {
    scientificName: 'Calocybe gambosa',
    commonName: 'Prugnolo',
    type: 'Fungo'
  },
  {
    scientificName: 'Clitocybe geotropa',
    commonName: 'Agarico geotropo',
    type: 'Fungo'
  },
  {
    scientificName: 'Coprinus comatus',
    commonName: 'Fungo dell\'inchiostro',
    type: 'Fungo'
  },
  {
    scientificName: 'Craterellus lutescens',
    commonName: 'Finferla',
    type: 'Fungo'
  },
  {
    scientificName: 'Flammulina velutipes',
    commonName: 'Fungo dell\'olmo',
    type: 'Fungo'
  },
  {
    scientificName: 'Grifola frondosa',
    commonName: 'Maitake',
    type: 'Fungo'
  },
  {
    scientificName: 'Hericium erinaceus',
    commonName: 'Fungo istrice',
    type: 'Fungo'
  },
  {
    scientificName: 'Hydnum rufescens',
    commonName: 'Steccherino bruno',
    type: 'Fungo'
  },
  {
    scientificName: 'Lactarius salmonicolor',
    commonName: 'Sanguinello delle conifere',
    type: 'Fungo'
  },
  {
    scientificName: 'Lactarius sanguifluus',
    commonName: 'Sanguinello vero',
    type: 'Fungo'
  },
  {
    scientificName: 'Leccinum aurantiacum',
    commonName: 'Porcinello rosso',
    type: 'Fungo'
  },
  {
    scientificName: 'Leccinum scabrum',
    commonName: 'Porcinello grigio',
    type: 'Fungo'
  },
  {
    scientificName: 'Lepista nuda',
    commonName: 'Agarico violetto',
    type: 'Fungo'
  },
  {
    scientificName: 'Lycoperdon perlatum',
    commonName: 'Vescia',
    type: 'Fungo'
  },
  {
    scientificName: 'Marasmius oreades',
    commonName: 'Gambesecche',
    type: 'Fungo'
  },
  {
    scientificName: 'Pleurotus eryngii',
    commonName: 'Cardoncello',
    type: 'Fungo'
  },
  {
    scientificName: 'Russula cyanoxantha',
    commonName: 'Colombina maggiore',
    type: 'Fungo'
  },
  {
    scientificName: 'Russula vesca',
    commonName: 'Russola commestibile',
    type: 'Fungo'
  },
  {
    scientificName: 'Suillus granulatus',
    commonName: 'Pinarolo',
    type: 'Fungo'
  },
  {
    scientificName: 'Suillus luteus',
    commonName: 'Pinarolo giallo',
    type: 'Fungo'
  },
  {
    scientificName: 'Tricholoma portentosum',
    commonName: 'Agarico terreo',
    type: 'Fungo'
  },
  {
    scientificName: 'Tricholoma terreum',
    commonName: 'Moretta',
    type: 'Fungo'
  },
  {
    scientificName: 'Volvariella volvacea',
    commonName: 'Fungo della paglia',
    type: 'Fungo'
  },
  {
    scientificName: 'Xerocomellus chrysenteron',
    commonName: 'Boleto dal cappello rosso',
    type: 'Fungo'
  },
  {
    scientificName: 'Agaricus arvensis',
    commonName: 'Prataiolo maggiore',
    type: 'Fungo'
  },
  {
    scientificName: 'Agaricus silvicola',
    commonName: 'Prataiolo di bosco',
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
  },
  {
    scientificName: 'Tuber uncinatum',
    commonName: 'Tartufo uncinato',
    type: 'Tartufo'
  },
  {
    scientificName: 'Tuber indicum',
    commonName: 'Tartufo cinese',
    type: 'Tartufo'
  },
  {
    scientificName: 'Tuber albidum',
    commonName: 'Tartufo bianco marzuolo',
    type: 'Tartufo'
  },
  {
    scientificName: 'Tuber rufum',
    commonName: 'Tartufo rossiccio',
    type: 'Tartufo'
  },
  {
    scientificName: 'Tuber excavatum',
    commonName: 'Tartufo scavato',
    type: 'Tartufo'
  },
  {
    scientificName: 'Tuber oligospermum',
    commonName: 'Tartufo oligospermo',
    type: 'Tartufo'
  }
];