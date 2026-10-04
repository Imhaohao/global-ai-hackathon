import { DISEASES, type DiseaseKey } from '../../../shared/src/index.ts';
import { DISEASES_SW, type DiseaseText } from '../../../shared/src/diseases.sw.ts';
import type { Severity } from '../diagnosis/conditions';

export type Language = 'en' | 'sw';

type BaseStrings = {
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

const english: BaseStrings = {
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

const swahili: BaseStrings = {
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


type Line = { en: string; sw: string; reviewed: boolean };

const draftLine = (en: string, sw: string): Line => ({ en, sw, reviewed: false });

const NEW_LINES = {
  consentTitle: draftLine('Before you start', 'Kabla ya kuanza'),
  consentPhotos: draftLine('Your photos stay on this phone.', 'Picha zako zinabaki kwenye simu hii.'),
  consentLocation: draftLine(
    'Each check saves where you were, so the officer knows which part of the farm.',
    'Kila ukaguzi huhifadhi mahali ulipokuwa, ili afisa ajue sehemu gani ya shamba.',
  ),
  consentNothingLeaves: draftLine(
    'Your photos and cases leave this phone only if you choose to send a case to your field officer by text message.',
    'Picha na kesi zako hutoka kwenye simu hii tu ukichagua kutuma kesi kwa afisa wako wa shamba kwa ujumbe mfupi.',
  ),
  consentRain: draftLine(
    'When you are online and allow location, the app sends a location rounded to about 10 km to our server, which asks NASA POWER for recent rainfall. No photos or names are sent.',
    'Ukiwa mtandaoni na umeruhusu eneo, programu hutuma eneo lililokadiriwa hadi kilomita 10 kwa seva yetu, inayouliza NASA POWER kuhusu mvua ya hivi karibuni. Hakuna picha wala majina yanayotumwa.',
  ),
  consentDelete: draftLine('You can delete everything in Settings.', 'Unaweza kufuta kila kitu kwenye Mipangilio.'),
  consentAgree: draftLine('Agree and continue', 'Kubali na uendelee'),
  consentWithoutLocation: draftLine('Continue without location', 'Endelea bila eneo'),
  captureTitle: draftLine('Check one coffee tree', 'Kagua mti mmoja wa kahawa'),
  captureTip: draftLine(
    'Photograph up to six leaves from the same tree. Hold each leaf flat in daylight and fill the screen.',
    'Piga picha hadi majani sita ya mti mmoja. Shika kila jani wazi kwenye mwanga na ulijaze skrini.',
  ),
  leavesTaken: draftLine('{count} of {max} leaves taken', 'Majani {count} kati ya {max} yamepigwa'),
  addAnotherLeaf: draftLine('Add another leaf', 'Ongeza jani jingine'),
  seeAdvice: draftLine('See advice', 'Angalia ushauri'),
  retakeLeaf: draftLine('Retake this leaf', 'Piga upya jani hili'),
  leafTooDark: draftLine(
    'Too dark or blurry. Move into daylight and hold steady.',
    'Giza sana au halionekani vizuri. Nenda kwenye mwanga na ushike imara.',
  ),
  leafNotClear: draftLine('Could not tell. Fill the frame with one leaf.', 'Haijaweza kujua. Jaza skrini na jani moja.'),
  retakeTitle: draftLine('Need more clear leaves', 'Tunahitaji majani zaidi yanayoonekana vizuri'),
  retakeBody: draftLine(
    'Three clear leaves that agree give an answer. Add another leaf or retake the marked ones.',
    'Majani matatu yanayoonekana vizuri na kukubaliana hutoa jibu. Ongeza jani jingine au piga upya yaliyowekewa alama.',
  ),
  leavesAgreeTitle: draftLine('{agreeing} of {usable} clear leaves agree', 'Majani {agreeing} kati ya {usable} yanakubaliana'),
  leavesDisagreeTitle: draftLine('The leaves do not agree', 'Majani hayakubaliani'),
  recheckOn: draftLine('Check again on {date}', 'Kagua tena {date}'),
  whatElse: draftLine('What else could it be', 'Inaweza kuwa nini kingine'),
  sendToOfficer: draftLine('Send to field officer', 'Tuma kwa afisa wa shamba'),
  callOfficer: draftLine('Call {name}', 'Piga simu {name}'),
  officerPhoneTitle: draftLine("Your field officer's phone number", 'Namba ya simu ya afisa wako wa shamba'),
  officerPhoneHelp: draftLine(
    'Saved on this phone and used only to open a text message.',
    'Inahifadhiwa kwenye simu hii na hutumika kufungua ujumbe mfupi tu.',
  ),
  officerPhonePlaceholder: draftLine('Phone number', 'Namba ya simu'),
  saveAndSend: draftLine('Save and send', 'Hifadhi na utume'),
  cancel: draftLine('Cancel', 'Ghairi'),
  smsUnavailable: draftLine('This phone cannot send text messages.', 'Simu hii haiwezi kutuma ujumbe mfupi.'),
  sentToOfficer: draftLine('Case opened in your messages app', 'Kesi imefunguliwa kwenye programu yako ya ujumbe'),
  farmSectionTitle: draftLine('Which part of the farm?', 'Sehemu gani ya shamba?'),
  addFarmSection: draftLine('Add a part of the farm', 'Ongeza sehemu ya shamba'),
  farmSectionPlaceholder: draftLine('For example, upper slope', 'Kwa mfano, mteremko wa juu'),
  checkAnotherTree: draftLine('Check another tree', 'Kagua mti mwingine'),
  leafAgrees: draftLine('Leaf {number}: matches the answer', 'Jani {number}: linalingana na jibu'),
  leafClear: draftLine('Leaf {number}: clear photo', 'Jani {number}: picha inaonekana vizuri'),
  leafDiffers: draftLine('Leaf {number}: shows something different', 'Jani {number}: linaonyesha kitu tofauti'),
  leafUnusable: draftLine('Leaf {number}: not clear enough', 'Jani {number}: halionekani vizuri'),
  settingsTitle: draftLine('Settings', 'Mipangilio'),
  openSettingsScreen: draftLine('Open settings', 'Fungua mipangilio'),
  back: draftLine('Back', 'Rudi'),
  saveLocation: draftLine('Save location with each check', 'Hifadhi eneo kwa kila ukaguzi'),
  officerNumberLabel: draftLine("Field officer's phone number", 'Namba ya simu ya afisa wa shamba'),
  farmSectionsLabel: draftLine('Parts of your farm', 'Sehemu za shamba lako'),
  removeFarmSection: draftLine('Remove {name}', 'Ondoa {name}'),
  exportData: draftLine('Export my data', 'Hamisha data yangu'),
  exportFailed: draftLine('Could not export. Try again.', 'Imeshindwa kuhamisha. Jaribu tena.'),
  deleteAll: draftLine('Delete everything on this phone', 'Futa kila kitu kwenye simu hii'),
  deleteConfirmTitle: draftLine('Delete everything?', 'Futa kila kitu?'),
  deleteConfirmBody: draftLine(
    'This removes saved checks, photos, your officer number and your choices. It cannot be undone.',
    'Hii huondoa ukaguzi uliohifadhiwa, picha, namba ya afisa wako na chaguo zako. Haiwezi kurudishwa.',
  ),
  deleteConfirm: draftLine('Delete', 'Futa'),
  savedChecks: draftLine('{count} saved checks', 'Ukaguzi {count} umehifadhiwa'),
  seedCheckTitle: draftLine('Check a seed packet', 'Kagua pakiti ya mbegu'),
  seedCheckTextButton: draftLine('Text the code to {phone}', 'Tuma namba kwa {phone}'),
  seedCheckSmsUnavailable: draftLine(
    'This phone cannot send text messages. Type the code into a message to this number:',
    'Simu hii haiwezi kutuma ujumbe mfupi. Andika namba ya siri kwenye ujumbe kwenda namba hii:',
  ),
  devVerdictTitle: draftLine('Test answer (development only)', 'Jibu la majaribio (maendeleo tu)'),
};

export type LineKey = keyof typeof NEW_LINES;

export type Strings = BaseStrings & Record<LineKey, string>;

function lineText(line: Line, language: Language): string {
  return language === 'sw' && line.reviewed ? line.sw : line.en;
}

function resolveLines(language: Language): Record<LineKey, string> {
  const entries = Object.entries(NEW_LINES).map(([key, line]) => [key, lineText(line, language)]);
  return Object.fromEntries(entries) as Record<LineKey, string>;
}

export function fillTemplate(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce((text, [key, value]) => text.replaceAll(`{${key}}`, String(value)), template);
}

export const STRINGS: Record<Language, Strings> = {
  en: { ...english, ...resolveLines('en') },
  sw: { ...swahili, ...resolveLines('sw') },
};
