import { adviceTextFor } from '../../../shared/src/adviceText.ts';
import { DEFAULT_LANGUAGE, LANGUAGES, languageInfo, type LanguageCode } from '../../../shared/src/languages.ts';
import type { DiseaseKey, DiseaseText } from '../../../shared/src/types.ts';
import type { Severity } from '../diagnosis/conditions';
import type { ModelId } from '../diagnosis/modelConfig';
import { UI_TRANSLATIONS } from './locales/index.ts';

export type Language = LanguageCode;

type BaseStrings = {
  homeTitle: string;
  photoTip: string;
  takePhoto: string;
  choosePhoto: string;
  worksOffline: string;
  checking: string;
  notSure: string;
  unclearTitle: string;
  unclearBody: string;
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
};

const english: BaseStrings = {
  homeTitle: 'Check a coffee leaf',
  photoTip: 'Hold one leaf flat in good light, close enough to fill the screen.',
  takePhoto: 'Take photo',
  choosePhoto: 'Choose photo',
  worksOffline: 'Works without internet',
  checking: 'Checking…',
  notSure: 'Not fully sure. Take one more photo to check.',
  unclearTitle: 'Leaf not clear',
  unclearBody: 'Take another photo of one leaf, in good light, from closer.',
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
};

const swahili: BaseStrings = {
  homeTitle: 'Kagua jani la kahawa',
  photoTip: 'Shika jani moja wazi kwenye mwanga mzuri, karibu hadi lijaze skrini.',
  takePhoto: 'Piga picha',
  choosePhoto: 'Tumia picha niliyo nayo',
  worksOffline: 'Inafanya kazi bila intaneti',
  checking: 'Inakagua jani…',
  notSure: 'Hakuna uhakika kamili. Piga picha nyingine kuhakikisha.',
  unclearTitle: 'Jani halionekani vizuri',
  unclearBody: 'Piga picha nyingine ya jani moja, kwenye mwanga mzuri, ukiwa karibu zaidi.',
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
  authLogIn: draftLine('Log in', 'Ingia'),
  authLoggingIn: draftLine('Logging in…', 'Inaingia…'),
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
  seedScanButton: draftLine('Scan packet barcode', 'Changanua msimbo wa pakiti'),
  seedScanHint: draftLine('Point the camera at the barcode on the seed packet.', 'Elekeza kamera kwenye msimbo wa pakiti ya mbegu.'),
  seedScanCancel: draftLine('Stop scanning', 'Acha kuchanganua'),
  seedScanAnother: draftLine('Scan another packet', 'Changanua pakiti nyingine'),
  seedGenuineTitle: draftLine('Genuine seed', 'Mbegu halisi'),
  seedGenuineStep1: draftLine('You can plant this seed.', 'Unaweza kupanda mbegu hii.'),
  seedGenuineStep2: draftLine('Keep the packet and your receipt until harvest.', 'Hifadhi pakiti na risiti yako hadi mavuno.'),
  seedRecalledTitle: draftLine('Do not plant this seed', 'Usipande mbegu hii'),
  seedRecalledStep1: draftLine('This lot failed its germination test and was recalled.', 'Kundi hili lilishindwa kipimo cha kuota na limerudishwa.'),
  seedRecalledStep2: draftLine('Do not plant it or give it to anyone.', 'Usiipande wala kumpa mtu yeyote.'),
  seedRecalledStep3: draftLine('Take it back to the seller with your receipt.', 'Irudishe kwa muuzaji pamoja na risiti yako.'),
  seedRecalledStep4: draftLine('Report it so other farmers are warned.', 'Ripoti ili wakulima wengine waonywe.'),
  seedUnknownTitle: draftLine('Code not recognized', 'Msimbo haujulikani'),
  seedUnknownStep1: draftLine('This does not mean the seed is fake.', 'Hii haimaanishi mbegu ni bandia.'),
  seedUnknownStep2: draftLine('Do not plant it until the code is checked.', 'Usiipande hadi namba ikaguliwe.'),
  seedUnknownStep3: draftLine('Text the scratch code to {phone}.', 'Tuma namba ya siri kwenda {phone}.'),
  seedUnknownStep4: draftLine('Report it if the seller cannot show where the seed came from.', 'Ripoti kama muuzaji hawezi kuonyesha mbegu ilikotoka.'),
  seedReport: draftLine('Report this seed', 'Ripoti mbegu hii'),
  seedReportMessage: draftLine(
    'Seed report from Leaf Doctor. Barcode {code}{packet}. Result: {result}. Bought from (seller and place): ',
    'Ripoti ya mbegu kutoka Leaf Doctor. Msimbo {code}{packet}. Matokeo: {result}. Nilinunua kutoka (muuzaji na mahali): ',
  ),
  seedReportPacket: draftLine(', {variety}, lot {lot}', ', {variety}, kundi {lot}'),
  seedReportOpened: draftLine(
    'Report opened in your messages app. Add who sold it to you, then send it to your field officer.',
    'Ripoti imefunguliwa kwenye programu ya ujumbe. Ongeza aliyekuuzia, kisha mtumie afisa ugani.',
  ),
  seedVariety: draftLine('Variety', 'Aina'),
  seedLot: draftLine('Lot', 'Kundi'),
  seedPackedOn: draftLine('Packed', 'Ilifungwa'),
  helpNowTitle: draftLine('Get help', 'Pata msaada'),
  callYourOfficer: draftLine('Call your field officer', 'Piga simu kwa afisa ugani'),
  callKalro: draftLine('Call KALRO farm research', 'Piga simu KALRO, utafiti wa kilimo'),
  buyTitle: draftLine('What to buy', 'Unachohitaji kununua'),
  buyAtDealer: draftLine('Show this list at your agro-dealer.', 'Onyesha orodha hii kwa muuzaji wa pembejeo.'),
  buyWaitForOfficer: draftLine(
    'Do not buy any spray yet. Wait until your field officer confirms the cause, so you do not pay for the wrong product.',
    'Usinunue dawa yoyote bado. Subiri afisa ugani athibitishe chanzo, ili usilipie bidhaa isiyofaa.',
  ),
  buyFertilizer: draftLine('Balanced fertilizer or manure', 'Mbolea iliyosawazishwa au samadi'),
  buyFertilizerWhy: draftLine('Look for nitrogen (N) and potassium (K). Fed trees fight disease better.', 'Tafuta naitrojeni (N) na potasiamu (K). Miti iliyolishwa vizuri hupambana na magonjwa.'),
  buyPruningTools: draftLine('Pruning saw or secateurs', 'Msumeno wa kupogoa au makasi'),
  buyPruningToolsWhy: draftLine('To cut out sick branches and let air through the tree.', 'Kukata matawi yenye ugonjwa na kupitisha hewa kwenye mti.'),
  buyCopperFungicide: draftLine('Copper fungicide, such as copper hydroxide', 'Dawa ya ukungu ya shaba, kama copper hydroxide'),
  buyCopperFungicideWhy: draftLine('Choose one labelled for coffee and use the rate on the label.', 'Chagua inayoruhusiwa kwa kahawa na tumia kipimo kilichoandikwa.'),
  buySprayGear: draftLine('Gloves, face mask and a knapsack sprayer', 'Glavu, barakoa na bomba la kunyunyizia'),
  buySprayGearWhy: draftLine('Wear the gloves and mask every time you spray.', 'Vaa glavu na barakoa kila unaponyunyizia.'),
  mapTitle: draftLine('Farm map', 'Ramani ya shamba'),
  mapSummary: draftLine('{sightings} sightings in {places} places', 'Matukio {sightings} katika maeneo {places}'),
  mapEmptyTitle: draftLine('No sightings on the map yet', 'Hakuna matukio kwenye ramani bado'),
  mapEmptyBody: draftLine(
    'Each check that finds a disease and saved a location appears here as a circle.',
    'Kila ukaguzi unaopata ugonjwa na kuhifadhi eneo huonekana hapa kama duara.',
  ),
  mapBiggerCircle: draftLine(
    'A bigger circle means more sightings close together.',
    'Duara kubwa zaidi linamaanisha matukio mengi karibu na kila moja.',
  ),
  mapNotChecked: draftLine(
    'An empty area means it was not checked. It does not mean the crop is healthy.',
    'Eneo tupu linamaanisha halikukaguliwa. Haimaanishi mazao ni mazima.',
  ),
  mapTapCircle: draftLine('Tap a circle to see its sightings.', 'Gusa duara kuona matukio yake.'),
  mapUnplaced: draftLine(
    '{count} checks have no saved location, so they are not on the map.',
    'Ukaguzi {count} hauna eneo lililohifadhiwa, kwa hiyo haupo kwenye ramani.',
  ),
  mapNoAnswer: draftLine(
    '{count} checks gave no clear answer, so they are not on the map.',
    'Ukaguzi {count} haukutoa jibu wazi, kwa hiyo haupo kwenye ramani.',
  ),
  mapRepeatsMerged: draftLine(
    '{count} repeat checks of the same tree were counted once.',
    'Ukaguzi {count} wa kurudia wa mti mmoja ulihesabiwa mara moja.',
  ),
  mapScale: draftLine('{meters} m', 'm {meters}'),
  mapNorth: draftLine('North', 'Kaskazini'),
  mapMapDescription: draftLine(
    'Schematic farm map with one circle for each group of sightings. Colors show the disease.',
    'Ramani ya shamba yenye duara moja kwa kila kundi la matukio. Rangi zinaonyesha ugonjwa.',
  ),
  rangeWeek: draftLine('7 days', 'Siku 7'),
  rangeMonth: draftLine('30 days', 'Siku 30'),
  rangeSeason: draftLine('90 days', 'Siku 90'),
  rangeAll: draftLine('All time', 'Wakati wote'),
  filterDiseases: draftLine('Diseases shown', 'Magonjwa yanayoonyeshwa'),
  trendTitle: draftLine('Sightings each week', 'Matukio kila wiki'),
  trendNote: draftLine(
    'These are checks that found a disease. They show what was recorded, not how fast it is spreading.',
    'Hivi ni ukaguzi uliopata ugonjwa. Vinaonyesha kilichorekodiwa, si kasi ya kuenea.',
  ),
  trendEmpty: draftLine('No sightings in this period.', 'Hakuna matukio katika kipindi hiki.'),
  trendWeekOf: draftLine('Week of {date}: {count} sightings', 'Wiki ya {date}: matukio {count}'),
  hotspotSightings: draftLine('{count} sightings', 'Matukio {count}'),
  sightingWhen: draftLine('Time', 'Wakati'),
  sightingWhere: draftLine('Location', 'Eneo'),
  sightingWhat: draftLine('Disease found', 'Ugonjwa uliopatikana'),
  sightingFarmSection: draftLine('Part of the farm', 'Sehemu ya shamba'),
  sightingPlace: draftLine('{latitude}, {longitude} (within {meters} m)', '{latitude}, {longitude} (ndani ya m {meters})'),
  sightingPlaceUnknownAccuracy: draftLine('{latitude}, {longitude}', '{latitude}, {longitude}'),
  sightingPhotos: draftLine('Photos from this check', 'Picha za ukaguzi huu'),
  sightingPhotoMissing: draftLine('Photo not available', 'Picha haipatikani'),
  sightingShowDetails: draftLine('Show details for {disease}, {time}', 'Onyesha maelezo ya {disease}, {time}'),
  mapSimulatedBanner: draftLine('Simulated sightings for a preview. They are not your data.', 'Matukio ya kubuni ya onyesho. Si data yako.'),
  mapPreviewSimulated: draftLine('Preview with simulated sightings (development only)', 'Onyesho la matukio ya kubuni (maendeleo tu)'),
  mapStopPreview: draftLine('Stop the preview', 'Acha onyesho'),
  devVerdictTitle: draftLine('Test answer (development only)', 'Jibu la majaribio (maendeleo tu)'),
  changeLanguage: draftLine('Change language', 'Badilisha lugha'),
  languageTitle: draftLine('Choose your language', 'Chagua lugha yako'),
  languageSuggested: draftLine('Suggested for you', 'Inapendekezwa kwako'),
  languageAll: draftLine('All languages', 'Lugha zote'),
  languageSearch: draftLine('Search languages', 'Tafuta lugha'),
  languageNoMatch: draftLine('No language matches "{query}".', 'Hakuna lugha inayolingana na "{query}".'),
  languageUseLocation: draftLine('Suggest languages for where I am', 'Pendekeza lugha za mahali nilipo'),
  languageFindingLocation: draftLine('Finding where you are…', 'Inatafuta mahali ulipo…'),
  languageLocationFailed: draftLine(
    'Could not find where you are. Choose from the list.',
    'Imeshindwa kujua mahali ulipo. Chagua kwenye orodha.',
  ),
  languageSelected: draftLine('Selected', 'Imechaguliwa'),
  translationUnchecked: draftLine(
    'A computer translated this advice and no person has checked it yet. If a step is unclear, ask your field officer.',
    'Kompyuta ilitafsiri ushauri huu na hakuna mtu aliyeukagua bado. Hatua ikiwa haieleweki, muulize afisa wako wa shamba.',
  ),
};

export type LineKey = keyof typeof NEW_LINES;

/** Everything a translator translates. Nested records keep their keys. */
export type UiText = BaseStrings & Record<LineKey, string>;

/** A translation may leave lines out; those fall back to English. */
export type UiTranslation = {
  [Key in keyof UiText]?: UiText[Key] extends string ? string : Partial<UiText[Key]>;
};

export type Strings = UiText & {
  language: Language;
  /** BCP 47 tag for the phone's text-to-speech voice and for dates. */
  speechLanguage: string;
  switchLanguage: string;
  diseases: Record<DiseaseKey, DiseaseText>;
  /** False while the advice in this language is a translation no native speaker has checked. */
  adviceChecked: boolean;
};

function linesIn(language: 'en' | 'sw'): Record<LineKey, string> {
  const entries = Object.entries(NEW_LINES).map(([key, line]) => [key, line[language]]);
  return Object.fromEntries(entries) as Record<LineKey, string>;
}

export const ENGLISH_UI_TEXT: UiText = { ...english, ...linesIn('en') };

const SWAHILI_UI_TEXT: UiTranslation = { ...swahili, ...linesIn('sw') };

function translationFor(language: Language): UiTranslation | undefined {
  if (language === 'sw') return SWAHILI_UI_TEXT;
  return UI_TRANSLATIONS[language]?.();
}

function mergeUiText(translation: UiTranslation = {}): UiText {
  const merged: Record<string, unknown> = { ...ENGLISH_UI_TEXT };
  for (const [key, english] of Object.entries(ENGLISH_UI_TEXT)) {
    const translated = translation[key as keyof UiText];
    if (!translated) continue;
    merged[key] = typeof english === 'string' ? translated : { ...english, ...(translated as object) };
  }
  return merged as UiText;
}

function buildStrings(language: Language): Strings {
  const ui = language === DEFAULT_LANGUAGE ? ENGLISH_UI_TEXT : mergeUiText(translationFor(language));
  const advice = adviceTextFor(language);
  return {
    ...ui,
    language,
    speechLanguage: languageInfo(language).locale,
    switchLanguage: ui.changeLanguage,
    diseases: advice.diseases,
    adviceChecked: advice.reviewed,
  };
}

const cache = new Map<Language, Strings>();

export function stringsFor(language: Language): Strings {
  const cached = cache.get(language);
  if (cached) return cached;
  const strings = buildStrings(language);
  cache.set(language, strings);
  return strings;
}

export function fillTemplate(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce((text, [key, value]) => text.replaceAll(`{${key}}`, String(value)), template);
}

/** Languages the app can show: English, Swahili and every language with a translation file. */
export const APP_LANGUAGES: Language[] = LANGUAGES.map(({ code }) => code).filter(
  (code) => code === DEFAULT_LANGUAGE || code === 'sw' || UI_TRANSLATIONS[code] !== undefined,
);

/** Built on first use, so only the languages someone opens are ever assembled. */
export const STRINGS = Object.defineProperties(
  {},
  Object.fromEntries(LANGUAGES.map(({ code }) => [code, { enumerable: true, get: () => stringsFor(code) }])),
) as Record<Language, Strings>;
