export const TYPES = {
  analyse: 'Analyse',
  ordonnance: 'Ordonnance',
  imagerie: 'Imagerie',
  compte_rendu: 'Compte rendu',
  vaccination: 'Vaccination',
  autre: 'Autre',
};

export const TYPE_COLORS = {
  analyse: '#1F6FB2',
  ordonnance: '#7A4FB0',
  imagerie: '#4A5560',
  compte_rendu: '#B7791F',
  vaccination: '#2E8B57',
  autre: '#8A9A94',
};

// La date arrive en "AAAA-MM-JJ" : on l'inverse à la main pour éviter tout décalage de fuseau
export function formatDate(d) {
  return d ? d.split('-').reverse().join('/') : 'Sans date';
}