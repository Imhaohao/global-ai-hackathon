import { DISEASES, type DiseaseKey } from '../../../shared/src/index.ts';
import { DISEASES_SW, type DiseaseText } from '../../../shared/src/diseases.sw.ts';
import type { Severity } from '../diagnosis/conditions';

export type Language = 'en' | 'sw';

export type Strings = {
  speechLanguage: string;
  switchLanguage: string;
  homeTitle: string;
  photoTip: string;
  takePhoto: string;
  choosePhoto: string;
  worksOffline: string;
  checking: string;
  notSure: string;
  unclearTitle: string;
  unclearBody: string;
  whatYouSee: string;
  whatToDo: string;
  readAloud: string;
  stopReading: string;
  checkAnother: string;
  tryAgain: string;
  cameraBlocked: string;
  openSettings: string;
  modelFailed: string;
  photoFailed: string;
  severity: Record<Severity, string>;
  diseases: Record<DiseaseKey, DiseaseText>;
};

const english: Strings = {
  speechLanguage: 'en',
  switchLanguage: 'Badili kwa Kiswahili',
  homeTitle: 'Check a coffee leaf',
  photoTip: 'Hold one leaf flat in good light, close enough to fill the screen.',
  takePhoto: 'Take a photo',
  choosePhoto: 'Use a photo I already have',
  worksOffline: 'Works without internet',
  checking: 'Looking at the leaf…',
  notSure: 'Not fully sure. Take one more photo to check.',
  unclearTitle: 'Leaf not clear',
  unclearBody: 'Take another photo of one leaf, in good light, from closer.',
  whatYouSee: 'What you can see',
  whatToDo: 'What to do',
  readAloud: 'Read aloud',
  stopReading: 'Stop reading',
  checkAnother: 'Check another leaf',
  tryAgain: 'Take another photo',
  cameraBlocked: 'The camera is turned off for Leaf Doctor. Open Settings and allow Camera.',
  openSettings: 'Open Settings',
  modelFailed: 'Leaf Doctor could not start. Close the app and open it again.',
  photoFailed: 'Unable to read that photo. Take a new one and try again.',
  severity: {
    healthy: 'Healthy',
    watch: 'Needs care',
    sick: 'Act soon',
  },
  diseases: DISEASES,
};

const swahili: Strings = {
  speechLanguage: 'sw',
  switchLanguage: 'Switch to English',
  homeTitle: 'Kagua jani la kahawa',
  photoTip: 'Shika jani moja wazi kwenye mwanga mzuri, karibu hadi lijaze skrini.',
  takePhoto: 'Piga picha',
  choosePhoto: 'Tumia picha niliyo nayo',
  worksOffline: 'Inafanya kazi bila intaneti',
  checking: 'Inakagua jani…',
  notSure: 'Hakuna uhakika kamili. Piga picha nyingine kuhakikisha.',
  unclearTitle: 'Jani halionekani vizuri',
  unclearBody: 'Piga picha nyingine ya jani moja, kwenye mwanga mzuri, ukiwa karibu zaidi.',
  whatYouSee: 'Unachoweza kuona',
  whatToDo: 'Cha kufanya',
  readAloud: 'Sikiliza',
  stopReading: 'Simamisha',
  checkAnother: 'Kagua jani jingine',
  tryAgain: 'Piga picha nyingine',
  cameraBlocked: 'Kamera imezimwa kwa Leaf Doctor. Fungua Mipangilio na uruhusu Kamera.',
  openSettings: 'Fungua Mipangilio',
  modelFailed: 'Leaf Doctor imeshindwa kuanza. Funga programu kisha uifungue tena.',
  photoFailed: 'Imeshindwa kusoma picha hiyo. Piga picha mpya ujaribu tena.',
  severity: {
    healthy: 'Mzima',
    watch: 'Inahitaji uangalizi',
    sick: 'Chukua hatua sasa',
  },
  diseases: DISEASES_SW,
};

export const STRINGS: Record<Language, Strings> = { en: english, sw: swahili };
