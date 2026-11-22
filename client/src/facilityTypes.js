export const FACILITY_TYPES = {
  hopital: 'Hôpital',
  clinique: 'Clinique',
  centre_sante: 'Centre de santé',
  cabinet: 'Cabinet',
  pharmacie: 'Pharmacie',
  laboratoire: 'Laboratoire',
};

export const FACILITY_PLURALS = {
  hopital: 'Hôpitaux',
  clinique: 'Cliniques',
  centre_sante: 'Centres de santé',
  cabinet: 'Cabinets',
  pharmacie: 'Pharmacies',
  laboratoire: 'Laboratoires',
};

export const FACILITY_COLORS = {
  hopital: '#1F6FB2',
  clinique: '#7A4FB0',
  centre_sante: '#0E6B52',
  cabinet: '#B7791F',
  pharmacie: '#2E8B57',
  laboratoire: '#4A5560',
};

export const telHref = (phone) => `tel:${phone.replace(/[^\d+]/g, '')}`;