import { DISEASES } from "./diseases.ts";
import type { DiseaseCatalog, DiseaseInfo, DiseaseKey } from "./types.ts";

export type DiseaseText = Pick<DiseaseInfo, "name" | "look" | "tellApart" | "actions" | "urgencyReason">;

export const DISEASES_SW: Record<DiseaseKey, DiseaseText> = {
  mites: {
    name: "Dalili zinazoweza kuwa za utitiri",
    look: "Picha inafanana na majani ya kahawa yenye uharibifu wa utitiri. Alama zinazofanana zinaweza kuwa na sababu nyingine, hivyo hakuna uhakika kamili.",
    actions: ["Muulize afisa ugani akague pande zote mbili za jani na athibitishe sababu kabla ya kuchagua matibabu."],
  },
  weevil: {
    name: "Uharibifu unaoweza kuwa wa wadudu wanaotafuna majani",
    look: "Jani linafanana na picha zilizoainishwa kuwa na uharibifu wa coco au weevil. Picha hii haiwezi kutambua aina ya mdudu.",
    actions: ["Muulize afisa ugani akague jani lililoharibika na wadudu walio kwenye mmea kabla ya kuchagua matibabu."],
  },
  rust: {
    name: "Kutu ya majani ya kahawa",
    look: "Madoa madogo ya manjano hafifu huonekana juu ya jani. Chini ya jani, kila doa lina unga wa manjano hadi machungwa iliyokolea unaotoka ukiugusa kwa kidole. Madoa ya zamani hubadilika kuwa kahawia katikati na majani hupukutika mapema. Kwa kawaida huanzia kwenye majani ya chini ya mti.",
    tellApart: "Kutu ina unga wa machungwa chini ya jani, lakini doa la jicho la kahawia lina duara kavu za kahawia zenye katikati ya kijivu-nyeupe na halina unga.",
    actions: [
      "Kagua chini ya majani ya chini mara kwa mara. Kuigundua mapema ndilo jambo muhimu zaidi.",
      "Ondoa na uchome au uzike majani na matawi yenye madoa ya machungwa.",
      "Pogoa na upunguze kivuli na magugu ili hewa ipite na majani yakauke haraka.",
      "Weka samadi au mbolea iliyosawazishwa. Miti dhaifu huathirika zaidi.",
      "Nyunyizia dawa ya kuvu yenye shaba, kama copper hydroxide, juu na chini ya majani wakati majani yaliyougua ni chini ya asilimia 5 hivi. Shaba hulinda majani mazima lakini haiponyi yaliyougua. Muulize afisa ugani kuhusu wakati sahihi.",
      "Ukipanda upya, muulize afisa ugani kuhusu aina zinazostahimili kutu kama Catimor au Sarchimor.",
    ],
    urgencyReason: "Huenea haraka kati ya miti na mashamba, na hasara kwenye aina zisizostahimili inaweza kufikia asilimia 30 hadi 80.",
  },
  cercospora: {
    name: "Doa la jicho la kahawia",
    look: "Madoa ya kahawia ya mviringo, hasa juu ya jani, yenye katikati ya kijivu-nyeupe na duara la kahawia iliyokolea, mara nyingi na mzunguko wa manjano. Madoa yana upana wa milimita 5 hadi 15 na yanaweza kuungana kuwa mabaka makubwa yaliyokufa. Matunda hupata mabaka meusi yaliyobonyea na huiva mapema mno.",
    tellApart: "Doa la jicho la kahawia lina duara kavu za kahawia zenye katikati ya kijivu hafifu na halina unga wa machungwa, lakini kutu ina unga wa machungwa chini ya jani.",
    actions: [
      "Lisha miti vizuri, hasa naitrojeni na potasiamu. Mara nyingi ulishaji mzuri hudhibiti ugonjwa huu.",
      "Acha kivuli chepesi, dhibiti magugu, na upogoe ili hewa ipite na majani yakauke.",
      "Baada ya kupogoa, ondoa au choma majani na matunda. Usiyarundike karibu na miti.",
      "Kwenye kitalu, tenganisha miche na uchome miche yenye madoa ya kahawia yenye duara.",
      "Ikiwa hali ni mbaya, dawa ya kuvu yenye shaba inaweza kulinda majani mazima. Muulize afisa ugani kwanza.",
    ],
    urgencyReason: "Hasa hudhoofisha miti yenye msongo, na kwa kawaida hupungua ulishaji na kivuli vikirekebishwa.",
  },
  miner: {
    name: "Mchimba jani wa kahawa",
    look: "Njia za manjano hafifu zinazopindapinda huonekana ndani ya jani na hugeuka kuwa mabaka ya kahawia yaliyokufa juu ya jani. Ukikunja jani, ngozi nyembamba ya juu ya baka hujiachia na unaweza kumwona funza mdogo anayeonekana ndani. Mashambulizi makubwa hufanya majani kupukutika.",
    tellApart: "Mabaka ya mchimba jani ni malengelenge kama karatasi yenye funza ndani yanayojiachia ukiyakunja, lakini doa la jicho la kahawia ni duara nadhifu lisilojiachia.",
    actions: [
      "Kunja mabaka ya kahawia kutafuta funza hai, hasa wakati wa kiangazi.",
      "Linda maadui wa asili kama nyigu wadogo na sisimizi kwa kuweka kivuli mchanganyiko na kuepuka kunyunyizia dawa bila sababu.",
      "Angalia kwa makini miti michanga na vitalu, na uondoe mabaka ya kwanza mapema.",
      "Ikiwa dawa ya wadudu inahitajika, muulize afisa ugani ni dawa ipi iliyo halali na salama nchini mwako.",
    ],
    urgencyReason: "Mashambulizi makubwa husababisha majani kupukutika na mavuno kupungua, hasa wakati wa joto na ukame.",
  },
  phoma: {
    name: "Doa la Phoma",
    look: "Madoa ya kahawia iliyokolea hadi meusi yenye upana hadi sentimita 2 kwenye majani ya zamani, yenye katikati hafifu na ukingo mweusi zaidi. Ncha za machipukizi machanga huwa nyeusi na kukauka, maua yanaweza kufa, na matunda hupukutika. Uharibifu unaweza kuanzia kwenye ncha au ukingo wa jani.",
    tellApart: "Phoma pia huua ncha za machipukizi machanga na maua katika nyanda za juu zenye baridi na upepo, lakini doa la jicho la kahawia hubaki kama madoa yenye duara na halikaushi ncha za machipukizi.",
    actions: [
      "Panda vizuia upepo katika maeneo yenye upepo. Majeraha ya upepo huruhusu kuvu kuingia.",
      "Pogoa na uharibu machipukizi yaliyokauka na matunda yaliyokaukia mtini, na upogoe ili hewa ikaushe majani.",
      "Lisha miti kwa mbolea iliyosawazishwa, hasa naitrojeni na potasiamu.",
      "Katika misimu ya baridi na upepo, nyunyizia dawa ya kuvu yenye shaba kabla ugonjwa haujaonekana. Muulize afisa ugani kuhusu wakati sahihi.",
    ],
    urgencyReason: "Katika nyanda za juu zenye baridi na upepo unaweza kuua machipukizi na maua na kupunguza mavuno kwa asilimia 15 hadi 43.",
  },
  healthy: {
    name: "Jani la kahawa lenye afya",
    look: "Jani lenye afya hung'aa, lina umbo la yai lenye ncha, na rangi ya kijani iliyokolea sawasawa, bila madoa, unga, matundu wala njia juu au chini yake.",
    actions: [
      "Pogoa, acha kivuli chepesi na dhibiti magugu ili majani yakauke haraka.",
      "Lisha miti kwa samadi au mbolea iliyosawazishwa, hasa naitrojeni na potasiamu.",
      "Kagua majani na upande wao wa chini kila wiki moja au mbili ili kugundua kutu au mchimba jani mapema.",
    ],
  },
};

export const DISEASES_IN_SWAHILI: DiseaseCatalog = Object.fromEntries(
  Object.values(DISEASES).map((disease) => [disease.key, { ...disease, ...DISEASES_SW[disease.key] }]),
) as DiseaseCatalog;
