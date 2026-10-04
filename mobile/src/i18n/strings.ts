import { DISEASES, type DiseaseKey } from '../../../shared/src/index.ts';
import { DISEASES_SW, type DiseaseText } from '../../../shared/src/diseases.sw.ts';
import type { Severity } from '../diagnosis/conditions';
import type { ModelId } from '../diagnosis/modelConfig';

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
  tooDarkTitle: string;
  tooDarkBody: string;
  tooBrightTitle: string;
  tooBrightBody: string;
  blurredTitle: string;
  blurredBody: string;
  whatYouSee: string;
  whatToDo: string;
  readAloud: string;
  stopReading: string;
  checkAnother: string;
  tryAgain: string;
  cameraBlocked: string;
  openSettings: string;
  modelFailed: string;
  chooseModel: string;
  modelDescriptions: Record<ModelId, string>;
  modelLoading: string;
  retryModel: string;
  modelUsed: string;
  photoFailed: string;
  severity: Record<Severity, string>;
  diseases: Record<DiseaseKey, DiseaseText>;
};

const english: BaseStrings = {
  speechLanguage: 'en',
  switchLanguage: 'Badili kwa Kiswahili',
  homeTitle: 'Check a coffee leaf',
  photoTip: 'Hold one leaf flat in good light, close enough to fill the screen.',
  takePhoto: 'Take photo',
  choosePhoto: 'Choose photo',
  worksOffline: 'Works without internet',
  checking: 'Checking…',
  notSure: 'Not fully sure. Take one more photo to check.',
  unclearTitle: 'Leaf not clear',
  unclearBody: 'Take another photo of one leaf, in good light, from closer.',
  tooDarkTitle: 'The photo is too dark',
  tooDarkBody: 'Increase the light on the leaf. Move to brighter, even light and take another photo.',
  tooBrightTitle: 'The photo is too bright',
  tooBrightBody: 'Reduce the light on the leaf. Move into shade or turn off the flash and take another photo.',
  blurredTitle: 'The photo is blurry',
  blurredBody: 'Hold the phone still and focus on one leaf before taking another photo.',
  whatYouSee: 'What you can see',
  whatToDo: 'What to do',
  readAloud: 'Read aloud',
  stopReading: 'Stop reading',
  checkAnother: 'Check another leaf',
  tryAgain: 'Take another photo',
  cameraBlocked: 'The camera is turned off for Leaf Doctor. Open Settings and allow Camera.',
  openSettings: 'Open Settings',
  modelFailed: 'This model could not load. Try again or choose another model.',
  chooseModel: 'Choose a leaf model',
  modelDescriptions: { b0: 'Original model', b1: 'Experimental model', b2: 'Experimental model' },
  modelLoading: 'Loading the selected model…',
  retryModel: 'Try loading again',
  modelUsed: 'Model used:',
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
  tooDarkTitle: 'Picha ina giza sana',
  tooDarkBody: 'Ongeza mwanga kwenye jani. Nenda penye mwanga zaidi unaoangaza jani sawasawa, kisha piga picha nyingine.',
  tooBrightTitle: 'Picha ina mwanga mwingi sana',
  tooBrightBody: 'Punguza mwanga kwenye jani. Nenda kivulini au zima flashi ya kamera, kisha piga picha nyingine.',
  blurredTitle: 'Picha haiko wazi',
  blurredBody: 'Shikilia simu bila kuitikisa na hakikisha kamera imelenga jani moja kabla ya kupiga picha nyingine.',
  whatYouSee: 'Unachoweza kuona',
  whatToDo: 'Cha kufanya',
  readAloud: 'Sikiliza',
  stopReading: 'Simamisha',
  checkAnother: 'Kagua jani jingine',
  tryAgain: 'Piga picha nyingine',
  cameraBlocked: 'Kamera imezimwa kwa Leaf Doctor. Fungua Mipangilio na uruhusu Kamera.',
  openSettings: 'Fungua Mipangilio',
  modelFailed: 'Mfumo huu haujapakiwa. Jaribu tena au chagua mfumo mwingine.',
  chooseModel: 'Chagua mfumo wa kukagua jani',
  modelDescriptions: { b0: 'Mfumo wa awali', b1: 'Mfumo wa majaribio', b2: 'Mfumo wa majaribio' },
  modelLoading: 'Inapakia mfumo uliochagua…',
  retryModel: 'Jaribu kupakia tena',
  modelUsed: 'Mfumo uliotumika:',
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
  photoGuide: draftLine('Photo guide', 'Mwongozo wa picha'),
  leavesReady: draftLine('Ready for advice', 'Tayari kwa ushauri'),
  nextStep: draftLine('Next', 'Endelea'),
  previousStep: draftLine('Previous', 'Rudi'),
  stepCount: draftLine('Step {number} of {count}', 'Hatua {number} kati ya {count}'),
  officerInvalidPhone: draftLine('Enter a phone number with 7 to 15 digits.', 'Weka namba ya simu yenye tarakimu 7 hadi 15.'),
  caseDetails: draftLine('Check details', 'Maelezo ya ukaguzi'),
  accountSettings: draftLine('Account', 'Akaunti'),
  farmSettings: draftLine('Farm', 'Shamba'),
  dataSettings: draftLine('Saved data', 'Data zilizohifadhiwa'),
  seedDetails: draftLine('About results', 'Kuhusu matokeo'),

  consentTitle: draftLine('Before you start', 'Kabla ya kuanza'),
  consentLogin: draftLine(
    'Signing in sends your phone number and verification code through Convex to Twilio Verify.',
    'Kuingia hutuma namba yako ya simu na nambari ya uthibitisho kupitia seva yetu hadi Twilio Verify.',
  ),
  consentPhotos: draftLine('Your photos stay on this phone.', 'Picha zako zinabaki kwenye simu hii.'),
  consentLocation: draftLine(
    'Each check saves where you were, so the officer knows which part of the farm.',
    'Kila ukaguzi huhifadhi mahali ulipokuwa, ili afisa ajue sehemu gani ya shamba.',
  ),
  consentNothingLeaves: draftLine(
    'Your saved checks leave this phone when you choose to send a text message or export them.',
    'Ukaguzi wako ulihifadhiwa hutoka kwenye simu hii ukichagua kutuma ujumbe mfupi au kuhamisha data.',
  ),
  consentRain: draftLine(
    'When you are online and allow location, the app sends a location rounded to about 10 km to our server, which asks NASA POWER for recent rainfall. No photos or names are sent.',
    'Ukiwa mtandaoni na umeruhusu eneo, programu hutuma eneo lililokadiriwa hadi kilomita 10 kwa seva yetu, inayouliza NASA POWER kuhusu mvua ya hivi karibuni. Hakuna picha wala majina yanayotumwa.',
  ),
  consentDelete: draftLine("You can delete this account's saved data on this phone in Settings.", 'Unaweza kufuta data zilizohifadhiwa za akaunti hii kwenye simu hii katika Mipangilio.'),
  consentAgree: draftLine('Agree and continue', 'Kubali na uendelee'),
  consentWithoutLocation: draftLine('Continue without location', 'Endelea bila eneo'),
  captureTitle: draftLine('Check one tree', 'Kagua mti mmoja'),
  captureTip: draftLine(
    'Photograph up to six leaves from the same tree. Hold each leaf flat in daylight and fill the screen.',
    'Piga picha hadi majani sita ya mti mmoja. Shika kila jani wazi kwenye mwanga na ulijaze skrini.',
  ),
  leavesTaken: draftLine('{count} of {max} leaves taken', 'Majani {count} kati ya {max} yamepigwa'),
  leafTaken: draftLine('Leaf {number}: photo taken', 'Jani {number}: picha imepigwa'),
  leafEmpty: draftLine('Leaf {number}: empty slot', 'Jani {number}: nafasi tupu'),
  addAnotherLeaf: draftLine('Add leaf', 'Ongeza jani'),
  seeAdvice: draftLine('See advice', 'Angalia ushauri'),
  retakeLeaf: draftLine('Retake this leaf', 'Piga upya jani hili'),
  retakeLeafNumber: draftLine('Leaf {number}: retake this leaf', 'Jani {number}: piga upya jani hili'),
  leafTooDark: draftLine(
    'Too dark or blurry. Move into daylight and hold steady.',
    'Giza sana au halionekani vizuri. Nenda kwenye mwanga na ushike imara.',
  ),
  leafNotClear: draftLine('Could not tell. Fill the frame with one leaf.', 'Haijaweza kujua. Jaza skrini na jani moja.'),
  retakeTitle: draftLine('Add clear leaves', 'Ongeza majani wazi'),
  retakeBody: draftLine(
    'Three clear leaves that agree give an answer. Add another leaf or retake the marked ones.',
    'Majani matatu yanayoonekana vizuri na kukubaliana hutoa jibu. Ongeza jani jingine au piga upya yaliyowekewa alama.',
  ),
  leavesAgreeTitle: draftLine('{agreeing} of {usable} clear leaves agree', 'Majani {agreeing} kati ya {usable} yanakubaliana'),
  leavesDisagreeTitle: draftLine('The leaves do not agree', 'Majani hayakubaliani'),
  recheckOn: draftLine('Check again on {date}', 'Kagua tena {date}'),
  whatElse: draftLine('Other causes', 'Sababu nyingine'),
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
  smsSent: draftLine('Case sent from your messages app.', 'Kesi imetumwa kutoka kwenye programu yako ya ujumbe.'),
  smsFailed: draftLine('The message could not be prepared. Try again.', 'Ujumbe haukuweza kutayarishwa. Jaribu tena.'),
  sentToOfficer: draftLine('Case opened in your messages app', 'Kesi imefunguliwa kwenye programu yako ya ujumbe'),
  farmSectionTitle: draftLine('Which part of the farm?', 'Sehemu gani ya shamba?'),
  addFarmSection: draftLine('Add a part of the farm', 'Ongeza sehemu ya shamba'),
  farmSectionPlaceholder: draftLine('For example, upper slope', 'Kwa mfano, mteremko wa juu'),
  checkAnotherTree: draftLine('Check another', 'Kagua mwingine'),
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
  exportingData: draftLine('Preparing export…', 'Inatayarisha data…'),
  exportFailed: draftLine('Could not export. Try again.', 'Imeshindwa kuhamisha. Jaribu tena.'),
  deleteFailed: draftLine(
    'Could not delete all saved data. Try again.',
    'Imeshindwa kufuta data zote. Jaribu tena.',
  ),
  deleteAll: draftLine("Delete this account's data", 'Futa data za akaunti hii'),
  deleteConfirmTitle: draftLine("Delete this account's data?", 'Ufute data za akaunti hii?'),
  deleteConfirmBody: draftLine(
    'This removes saved checks, photos, your officer number and your choices for this account on this phone. It cannot be undone.',
    'Hii huondoa ukaguzi, picha, namba ya afisa na chaguo za akaunti hii kwenye simu hii. Haiwezi kurudishwa.',
  ),
  authTitle: draftLine('Leaf Doctor', 'Leaf Doctor'),
  authPhoneLabel: draftLine('Phone number', 'Namba ya simu'),
  authPhoneHint: draftLine(
    'Include the country code, for example +254712345678.',
    'Weka msimbo wa nchi, kwa mfano +254712345678.',
  ),
  authSendCode: draftLine('Send code', 'Tuma nambari ya siri'),
  authSendingCode: draftLine('Sending code…', 'Inatuma nambari ya siri…'),
  authCodeTitle: draftLine('Enter your code', 'Weka nambari yako ya siri'),
  authCodeHint: draftLine('We sent a code to {phone}.', 'Tumetuma nambari ya siri kwa {phone}.'),
  authCodeLabel: draftLine('Text message code', 'Nambari ya siri ya ujumbe mfupi'),
  authVerifyCode: draftLine('Verify code', 'Thibitisha nambari'),
  authVerifyingCode: draftLine('Verifying code…', 'Inathibitisha nambari…'),
  authChangePhone: draftLine('Change phone number', 'Badili namba ya simu'),
  authResendCode: draftLine('Send another code', 'Tuma nambari nyingine'),
  authResendIn: draftLine('Send another code in {seconds} seconds', 'Tuma nambari nyingine baada ya sekunde {seconds}'),
  authTryAgainIn: draftLine('Try again in {seconds} seconds', 'Jaribu tena baada ya sekunde {seconds}'),
  authInvalidPhone: draftLine(
    'Use an international number starting with + and the country code.',
    'Tumia namba ya kimataifa inayoanza na + na msimbo wa nchi.',
  ),
  authInvalidCode: draftLine('Enter the 4 to 10 digit code from your text message.', 'Weka nambari ya tarakimu 4 hadi 10 kutoka kwenye ujumbe mfupi.'),
  authIncorrectCode: draftLine('That code is incorrect or expired. Try again or request a new code.', 'Nambari hiyo si sahihi au muda wake umeisha. Jaribu tena au omba nambari mpya.'),
  authRateLimited: draftLine('Wait a little before trying again.', 'Subiri kidogo kabla ya kujaribu tena.'),
  authUnavailable: draftLine('Unable to sign in. Check your connection or try again later.', 'Imeshindwa kuingia. Angalia intaneti au ujaribu tena baadaye.'),
  authSignOut: draftLine('Sign out', 'Toka kwenye akaunti'),
  authSigningOut: draftLine('Signing out…', 'Inatoka kwenye akaunti…'),
  authSignOutFailed: draftLine('Unable to sign out. Try again.', 'Imeshindwa kutoka. Jaribu tena.'),
  authSignedInAs: draftLine('Signed in phone number', 'Namba ya simu iliyoingia'),
  deleteConfirm: draftLine('Delete', 'Futa'),
  savedChecks: draftLine('{count} saved checks', 'Ukaguzi {count} umehifadhiwa'),
  seedCheckTitle: draftLine('Check seeds', 'Kagua mbegu'),
  seedCheckTextButton: draftLine('Text code', 'Tuma namba'),
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
