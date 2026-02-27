// lib/schools.ts
export interface SchoolOption {
  value: string;
  label: string;
}

export const RIMINI_SCHOOLS: SchoolOption[] = [
  { value: 'Liceo Scientifico A. Einstein', label: 'Liceo Scientifico A. Einstein' },
  { value: 'Liceo Classico G. Cesare - M. Valgimigli', label: 'Liceo Classico G. Cesare - M. Valgimigli' },
  { value: 'ITTS O. Belluzzi - L. Da Vinci', label: 'ITTS O. Belluzzi - L. Da Vinci' },
  { value: 'Liceo Artistico Serpieri', label: 'Liceo Artistico Serpieri' },
  { value: 'Istituto Tecnico R. Valturio', label: 'Istituto Tecnico R. Valturio' },
  { value: 'IPSIA L.B. Alberti', label: 'IPSIA L.B. Alberti' },
  { value: 'ISISS P. Gobetti - A. De Gasperi (Morciano)', label: 'ISISS P. Gobetti - A. De Gasperi (Morciano)' },
  { value: 'altro', label: 'Altro (Specifica)' },
];
