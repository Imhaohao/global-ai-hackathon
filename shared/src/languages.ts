export interface LanguageInfo {
  code: string;
  englishName: string;
  nativeName: string;
  /** BCP 47 tag for dates, numbers and the phone's text-to-speech voices. */
  locale: string;
  rightToLeft?: boolean;
  /** The ElevenLabs phone line can switch a call into this language. */
  phoneLine: boolean;
}

const voice = <Code extends string>(code: Code, englishName: string, nativeName: string, locale: string, rightToLeft?: boolean) => ({
  code,
  englishName,
  nativeName,
  locale,
  phoneLine: true,
  ...(rightToLeft ? { rightToLeft } : {}),
}) satisfies LanguageInfo;

const textOnly = <Code extends string>(code: Code, englishName: string, nativeName: string, locale: string, rightToLeft?: boolean) => ({
  code,
  englishName,
  nativeName,
  locale,
  phoneLine: false,
  ...(rightToLeft ? { rightToLeft } : {}),
}) satisfies LanguageInfo;

// The 91 languages of Eleven v4 Turbo (https://elevenlabs.io/docs/overview/models), then 9 spoken in coffee regions it lacks.
// ElevenLabs agents only switch calls into 80 of the 91 (their API rejected the other 11 as presets on 3 Oct 2026),
// so those 11 are text-only here even though the voice model can pronounce them.
export const LANGUAGES = [
  voice("en", "English", "English", "en-GB"),
  voice("sw", "Swahili", "Kiswahili", "sw-KE"),
  voice("af", "Afrikaans", "Afrikaans", "af-ZA"),
  textOnly("am", "Amharic", "አማርኛ", "am-ET"),
  voice("ar", "Arabic", "العربية", "ar", true),
  voice("hy", "Armenian", "Հայերեն", "hy-AM"),
  voice("as", "Assamese", "অসমীয়া", "as-IN"),
  voice("ast", "Asturian", "Asturianu", "ast-ES"),
  voice("az", "Azerbaijani", "Azərbaycan dili", "az-AZ"),
  voice("be", "Belarusian", "Беларуская", "be-BY"),
  voice("bn", "Bengali", "বাংলা", "bn-BD"),
  voice("bs", "Bosnian", "Bosanski", "bs-BA"),
  voice("bg", "Bulgarian", "Български", "bg-BG"),
  voice("my", "Burmese", "မြန်မာ", "my-MM"),
  voice("yue", "Cantonese", "粵語", "zh-HK"),
  voice("ca", "Catalan", "Català", "ca-ES"),
  textOnly("ceb", "Cebuano", "Cebuano", "ceb-PH"),
  voice("hr", "Croatian", "Hrvatski", "hr-HR"),
  voice("cs", "Czech", "Čeština", "cs-CZ"),
  voice("da", "Danish", "Dansk", "da-DK"),
  voice("nl", "Dutch", "Nederlands", "nl-NL"),
  voice("et", "Estonian", "Eesti", "et-EE"),
  voice("fil", "Filipino", "Filipino", "fil-PH"),
  voice("fi", "Finnish", "Suomi", "fi-FI"),
  voice("fr", "French", "Français", "fr-FR"),
  textOnly("ff", "Fula", "Pulaar", "ff-SN"),
  voice("gl", "Galician", "Galego", "gl-ES"),
  voice("ka", "Georgian", "ქართული", "ka-GE"),
  voice("de", "German", "Deutsch", "de-DE"),
  voice("el", "Greek", "Ελληνικά", "el-GR"),
  voice("gu", "Gujarati", "ગુજરાતી", "gu-IN"),
  voice("ha", "Hausa", "Hausa", "ha-NG"),
  voice("he", "Hebrew", "עברית", "he-IL", true),
  voice("hi", "Hindi", "हिन्दी", "hi-IN"),
  voice("hu", "Hungarian", "Magyar", "hu-HU"),
  voice("is", "Icelandic", "Íslenska", "is-IS"),
  voice("id", "Indonesian", "Bahasa Indonesia", "id-ID"),
  voice("it", "Italian", "Italiano", "it-IT"),
  voice("ja", "Japanese", "日本語", "ja-JP"),
  voice("jv", "Javanese", "Basa Jawa", "jv-ID"),
  textOnly("kam", "Kamba", "Kikamba", "kam-KE"),
  voice("kn", "Kannada", "ಕನ್ನಡ", "kn-IN"),
  voice("kk", "Kazakh", "Қазақ тілі", "kk-KZ"),
  voice("ko", "Korean", "한국어", "ko-KR"),
  voice("ky", "Kyrgyz", "Кыргызча", "ky-KG"),
  textOnly("lo", "Lao", "ລາວ", "lo-LA"),
  voice("lv", "Latvian", "Latviešu", "lv-LV"),
  textOnly("ln", "Lingala", "Lingála", "ln-CD"),
  voice("lt", "Lithuanian", "Lietuvių", "lt-LT"),
  textOnly("lg", "Luganda", "Luganda", "lg-UG"),
  voice("lb", "Luxembourgish", "Lëtzebuergesch", "lb-LU"),
  voice("mk", "Macedonian", "Македонски", "mk-MK"),
  voice("ms", "Malay", "Bahasa Melayu", "ms-MY"),
  voice("ml", "Malayalam", "മലയാളം", "ml-IN"),
  voice("mt", "Maltese", "Malti", "mt-MT"),
  voice("zh", "Mandarin Chinese", "中文", "zh-CN"),
  voice("mi", "Māori", "Te Reo Māori", "mi-NZ"),
  voice("mr", "Marathi", "मराठी", "mr-IN"),
  voice("mn", "Mongolian", "Монгол", "mn-MN"),
  voice("ne", "Nepali", "नेपाली", "ne-NP"),
  voice("nb", "Norwegian", "Norsk bokmål", "nb-NO"),
  voice("oc", "Occitan", "Occitan", "oc-FR"),
  voice("or", "Odia", "ଓଡ଼ିଆ", "or-IN"),
  voice("ps", "Pashto", "پښتو", "ps-AF", true),
  voice("fa", "Persian", "فارسی", "fa-IR", true),
  voice("pl", "Polish", "Polski", "pl-PL"),
  voice("pt", "Portuguese", "Português", "pt-BR"),
  voice("pa", "Punjabi", "ਪੰਜਾਬੀ", "pa-IN"),
  voice("ro", "Romanian", "Română", "ro-RO"),
  voice("ru", "Russian", "Русский", "ru-RU"),
  voice("sr", "Serbian", "Српски", "sr-RS"),
  textOnly("sn", "Shona", "chiShona", "sn-ZW"),
  voice("sd", "Sindhi", "سنڌي", "sd-PK", true),
  voice("sk", "Slovak", "Slovenčina", "sk-SK"),
  voice("sl", "Slovenian", "Slovenščina", "sl-SI"),
  voice("so", "Somali", "Soomaali", "so-SO"),
  textOnly("ckb", "Sorani Kurdish", "کوردی", "ckb-IQ", true),
  voice("es", "Spanish", "Español", "es-419"),
  voice("sv", "Swedish", "Svenska", "sv-SE"),
  voice("tg", "Tajik", "Тоҷикӣ", "tg-TJ"),
  voice("ta", "Tamil", "தமிழ்", "ta-IN"),
  voice("te", "Telugu", "తెలుగు", "te-IN"),
  voice("th", "Thai", "ไทย", "th-TH"),
  voice("tr", "Turkish", "Türkçe", "tr-TR"),
  voice("uk", "Ukrainian", "Українська", "uk-UA"),
  voice("ur", "Urdu", "اردو", "ur-PK", true),
  voice("uz", "Uzbek", "Oʻzbekcha", "uz-UZ"),
  voice("vi", "Vietnamese", "Tiếng Việt", "vi-VN"),
  voice("cy", "Welsh", "Cymraeg", "cy-GB"),
  textOnly("wo", "Wolof", "Wolof", "wo-SN"),
  textOnly("zu", "Zulu", "isiZulu", "zu-ZA"),
  textOnly("rw", "Kinyarwanda", "Ikinyarwanda", "rw-RW"),
  textOnly("rn", "Kirundi", "Ikirundi", "rn-BI"),
  textOnly("om", "Oromo", "Afaan Oromoo", "om-ET"),
  textOnly("ti", "Tigrinya", "ትግርኛ", "ti-ER"),
  textOnly("luo", "Dholuo", "Dholuo", "luo-KE"),
  textOnly("mg", "Malagasy", "Malagasy", "mg-MG"),
  textOnly("tet", "Tetum", "Tetun", "tet-TL"),
  textOnly("ht", "Haitian Creole", "Kreyòl ayisyen", "ht-HT"),
  textOnly("qu", "Quechua", "Runa Simi", "qu-PE"),
] as const satisfies readonly LanguageInfo[];

export type LanguageCode = (typeof LANGUAGES)[number]["code"];

export const DEFAULT_LANGUAGE: LanguageCode = "en";

const BY_CODE = new Map<string, LanguageInfo>(LANGUAGES.map((language) => [language.code, language]));

export function isLanguageCode(value: unknown): value is LanguageCode {
  return typeof value === "string" && BY_CODE.has(value);
}

export function languageInfo(code: LanguageCode): LanguageInfo {
  return BY_CODE.get(code) as LanguageInfo;
}

// Device language codes that name the same language under another code.
const DEVICE_CODE_ALIASES: Record<string, LanguageCode> = { tl: "fil", no: "nb", nn: "nb", iw: "he", in: "id", ku: "ckb" };

/** Maps a device or ISO 639 language code ("sw", "tl", "zh") to a supported language, if any. */
export function languageForDeviceCode(languageCode: string | null | undefined, regionCode?: string | null): LanguageCode | null {
  if (!languageCode) return null;
  const code = languageCode.toLowerCase();
  if (code === "zh" && (regionCode === "HK" || regionCode === "MO")) return "yue";
  const alias = DEVICE_CODE_ALIASES[code];
  if (alias) return alias;
  return isLanguageCode(code) ? code : null;
}

/** Main languages of each country, most widely understood first. Countries are ISO 3166-1 alpha-2. */
export const COUNTRY_LANGUAGES: Record<string, readonly LanguageCode[]> = {
  AD: ["ca", "es", "fr"], AE: ["ar", "en", "ur", "hi"], AF: ["fa", "ps", "uz"], AL: ["en"], AM: ["hy", "ru"],
  AO: ["pt", "ln"], AR: ["es"], AT: ["de"], AU: ["en"], AZ: ["az", "ru"],
  BA: ["bs", "hr", "sr"], BD: ["bn", "en"], BE: ["nl", "fr", "de"], BF: ["fr", "ff"], BG: ["bg"],
  BH: ["ar", "en"], BI: ["rn", "fr", "sw"], BJ: ["fr"], BN: ["ms", "en"], BO: ["es", "qu"],
  BR: ["pt"], BT: ["ne", "en"], BW: ["en"], BY: ["be", "ru"], BZ: ["en", "es"],
  CA: ["en", "fr"], CD: ["fr", "ln", "sw"], CF: ["fr", "ln"], CG: ["fr", "ln"], CH: ["de", "fr", "it"],
  CI: ["fr"], CL: ["es"], CM: ["fr", "en", "ff", "ha"], CN: ["zh"], CO: ["es"],
  CR: ["es"], CU: ["es"], CV: ["pt"], CY: ["el", "tr", "en"], CZ: ["cs"],
  DE: ["de"], DJ: ["fr", "ar", "so"], DK: ["da"], DO: ["es"], DZ: ["ar", "fr"],
  EC: ["es", "qu"], EE: ["et", "ru"], EG: ["ar", "en"], ER: ["ti", "ar"], ES: ["es", "ca", "gl", "ast"],
  ET: ["am", "om", "ti", "so"], FI: ["fi", "sv"], FJ: ["en", "hi"], FR: ["fr", "oc"], GA: ["fr"],
  GB: ["en", "cy"], GE: ["ka", "ru"], GH: ["en", "ha"], GM: ["en", "wo", "ff"], GN: ["fr", "ff"],
  GQ: ["es", "fr"], GR: ["el"], GT: ["es"], GW: ["pt", "ff"], GY: ["en"],
  HK: ["yue", "en", "zh"], HN: ["es"], HR: ["hr"], HT: ["ht", "fr"], HU: ["hu"],
  ID: ["id", "jv"], IE: ["en"], IL: ["he", "ar", "ru"], IN: ["hi", "en", "bn", "te", "mr", "ta", "ur", "gu", "kn", "ml", "or", "pa", "as"], IQ: ["ar", "ckb"],
  IR: ["fa", "ckb", "az"], IS: ["is"], IT: ["it"], JM: ["en"], JO: ["ar", "en"],
  JP: ["ja"], KE: ["sw", "en", "kam", "luo", "so", "om"], KG: ["ky", "ru"], KH: ["en", "fr"], KM: ["fr", "ar", "sw"],
  KP: ["ko"], KR: ["ko"], KW: ["ar", "en"], KZ: ["kk", "ru"], LA: ["lo"],
  LB: ["ar", "fr", "en"], LI: ["de"], LK: ["ta", "en"], LR: ["en"], LS: ["en", "zu"],
  LT: ["lt", "ru"], LU: ["lb", "fr", "de"], LV: ["lv", "ru"], LY: ["ar"], MA: ["ar", "fr"],
  MC: ["fr"], MD: ["ro", "ru"], ME: ["sr", "bs"], MG: ["mg", "fr"], MK: ["mk"],
  ML: ["fr", "ff"], MM: ["my"], MN: ["mn"], MO: ["yue", "zh", "pt"], MR: ["ar", "ff", "wo", "fr"],
  MT: ["mt", "en"], MU: ["en", "fr"], MW: ["en"], MX: ["es"], MY: ["ms", "en", "zh", "ta"],
  MZ: ["pt", "sw"], NA: ["en", "af"], NE: ["fr", "ha", "ff"], NG: ["en", "ha", "ff"], NI: ["es"],
  NL: ["nl"], NO: ["nb"], NP: ["ne", "hi"], NZ: ["en", "mi"], OM: ["ar", "en"],
  PA: ["es"], PE: ["es", "qu"], PG: ["en"], PH: ["fil", "en", "ceb"], PK: ["ur", "en", "pa", "ps", "sd"],
  PL: ["pl"], PR: ["es", "en"], PS: ["ar"], PT: ["pt"], PY: ["es"],
  QA: ["ar", "en"], RO: ["ro"], RS: ["sr"], RU: ["ru"], RW: ["rw", "en", "fr", "sw"],
  SA: ["ar"], SB: ["en"], SD: ["ar", "en"], SE: ["sv"], SG: ["en", "zh", "ms", "ta"],
  SI: ["sl"], SK: ["sk"], SL: ["en"], SM: ["it"], SN: ["fr", "wo", "ff"],
  SO: ["so", "ar"], SR: ["nl"], SS: ["en", "ar"], ST: ["pt"], SV: ["es"],
  SY: ["ar"], SZ: ["en", "zu"], TD: ["fr", "ar"], TG: ["fr"], TH: ["th"],
  TJ: ["tg", "ru"], TL: ["tet", "pt", "id"], TN: ["ar", "fr"], TR: ["tr"], TT: ["en"],
  TW: ["zh"], TZ: ["sw", "en", "luo"], UA: ["uk", "ru"], UG: ["en", "lg", "sw"], US: ["en", "es"],
  UY: ["es"], UZ: ["uz", "ru"], VE: ["es"], VN: ["vi"], YE: ["ar"],
  ZA: ["zu", "af", "en"], ZM: ["en"], ZW: ["en", "sn"],
};

export interface LanguageSignals {
  /** Country from the phone's position, if the farmer let the app use it. */
  locationCountry?: string | null;
  /** The phone's preferred languages, most preferred first. */
  deviceLanguages?: readonly { languageCode: string | null; regionCode?: string | null }[];
  /** The phone's region setting. */
  deviceRegion?: string | null;
}

const MAX_SUGGESTIONS = 5;

function countryLanguages(country: string | null | undefined): readonly LanguageCode[] {
  return country ? (COUNTRY_LANGUAGES[country.toUpperCase()] ?? []) : [];
}

/**
 * Languages to offer first, most likely first: where the phone is, then what the phone is set to, then its region.
 * Only languages in `offered` are returned, when it is given.
 */
export function suggestLanguages(signals: LanguageSignals, offered?: ReadonlySet<LanguageCode>): LanguageCode[] {
  const fromDevice = (signals.deviceLanguages ?? []).map((locale) => languageForDeviceCode(locale.languageCode, locale.regionCode));
  const ranked = [
    ...countryLanguages(signals.locationCountry),
    ...fromDevice,
    ...countryLanguages(signals.deviceRegion),
    DEFAULT_LANGUAGE,
  ].filter((code): code is LanguageCode => code !== null && (!offered || offered.has(code)));
  return [...new Set(ranked)].slice(0, MAX_SUGGESTIONS);
}
