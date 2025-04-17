// Icons utility that references the public assets
const BASE_PATH = './assets/icons';

export const icons = {
  mushroom: `${BASE_PATH}/mushroom-tag-icon.svg`,
  truffle: `${BASE_PATH}/truffle-tag-icon.svg`,
  poi: `${BASE_PATH}/point-of-interest-tag-icon.svg`,
  sfondo: `${BASE_PATH}/SfondoAPP.svg`,
  logo: `${BASE_PATH}/LogoFTL.svg`,
  mapNav: `${BASE_PATH}/map-navigation-orange-icon.svg`
};

export const getIconUrl = (type: 'Fungo' | 'Tartufo' | 'poi') => {
  switch (type) {
    case 'Fungo':
      return icons.mushroom;
    case 'Tartufo':
      return icons.truffle;
    default:
      return icons.poi;
  }
}; 