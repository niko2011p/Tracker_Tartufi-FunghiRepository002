// Use direct imports that resolve correctly in build
import mushroomIcon from './mushroom-tag-icon.svg';
import truffleIcon from './truffle-tag-icon.svg';
import poiIcon from './point-of-interest-tag-icon.svg';
import sfondoApp from './SfondoAPP.svg';
import logoFTL from './LogoFTL.svg';
import mapNavigation from './map-navigation-orange-icon.svg';

export const icons = {
  mushroom: mushroomIcon,
  truffle: truffleIcon,
  poi: poiIcon,
  sfondo: sfondoApp,
  logo: logoFTL,
  mapNav: mapNavigation
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