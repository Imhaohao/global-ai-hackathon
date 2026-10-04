/**
 * Every figure the deck shows, with the year it describes and where it comes from.
 * status: "checked" = opened and confirmed for this deck; "read" = a teammate read the page (docs/research-sources.md);
 * "measured" = produced by this repository's own code or evaluation.
 */
export type FactStatus = "checked" | "read" | "measured";

export type Fact = {
  value: number;
  display: string;
  year: string;
  source: string;
  url?: string;
  status: FactStatus;
};

function fact(value: number, display: string, year: string, source: string, status: FactStatus, url?: string): Fact {
  return { value, display, year, source, status, url };
}

export const facts = {
  agricultureEmployment: fact(45.8, "45.8%", "2025", "World Bank WDI, employment in agriculture (modelled ILO estimate), Kenya", "checked", "https://api.worldbank.org/v2/country/KEN/indicator/SL.AGR.EMPL.ZS"),
  ruralPopulation: fact(67.8, "67.8%", "2025", "World Bank WDI, rural population, Kenya", "checked", "https://api.worldbank.org/v2/country/KEN/indicator/SP.RUR.TOTL.ZS"),
  ruralElectricity: fact(67.1, "67.1%", "2024", "World Bank WDI, access to electricity, rural Kenya", "checked", "https://api.worldbank.org/v2/country/KEN/indicator/EG.ELC.ACCS.RU.ZS"),
  extensionTarget: fact(600, "1 : 600", "2029 target", "Kenya Agricultural Sector Extension Policy, Dec 2023, p. 8", "checked", "https://kilimo.go.ke/wp-content/uploads/2024/10/KENYA-AGRICULTURAL-SECTOR-EXTENSION-POLICY-2023.pdf"),
  ugandaPostsFilled: fact(2561, "2,561 of 5,874", "2024", "Uganda Auditor-General via The Cooperator, 20 Feb 2025", "read", "https://thecooperator.news/ag-faults-ministry-for-shortage-of-agricultural-extension-workers/"),
  ruralPhoneOwnership: fact(91.5, "91.5%", "2024", "World Bank Global Findex 2024, rural adults 15+, Kenya", "checked", "https://api.worldbank.org/v2/country/KEN/indicator/con1.9?source=28"),
  ruralBasicPhoneMain: fact(38.4, "38.4%", "2024", "World Bank Global Findex 2024, rural adults 15+ whose main phone is a basic text phone, Kenya", "checked", "https://api.worldbank.org/v2/country/KEN/indicator/con9b.9?source=28"),
  ruralSmartphoneMain: fact(52.8, "52.8%", "2024", "World Bank Global Findex 2024, rural adults 15+ whose main phone is a smartphone, Kenya", "checked", "https://api.worldbank.org/v2/country/KEN/indicator/con9a.9?source=28"),
  ruralDailyInternet: fact(33.7, "33.7%", "2024", "World Bank Global Findex 2024, rural adults 15+ who use the internet daily, Kenya", "checked", "https://api.worldbank.org/v2/country/KEN/indicator/con26d.9?source=28"),
  ruralMobileMoney: fact(85.7, "85.7%", "2024", "World Bank Global Findex 2024, rural adults with a mobile money account, Kenya", "checked", "https://api.worldbank.org/v2/country/KEN/indicator/mobileaccount.t.d.9?source=28"),
  othayaPopulation: fact(206191, "206,191", "2020", "WorldPop constrained population, 100 m grid, people within 10 km of Othaya, Nyeri", "measured", "https://hub.worldpop.org/geodata/summary?id=49643"),
  phoneAdviceYield: fact(4, "4%", "meta-analysis", "GiveWell review of Precision Agriculture for Development: phone-only advice, confidence interval -3% to 10%", "read", "https://www.givewell.org/international/technical/programs/precision-agriculture-for-development"),
  nuruField: fact(65, "65%", "2020", "Nuru cassava app in the field vs extension agents 40-58% and farmers 18-31% (Frontiers in Plant Science)", "read", "https://www.frontiersin.org/journals/plant-science/articles/10.3389/fpls.2020.590889/full"),
  zeroShotBanana: fact(42.42, "42.42%", "2026", "BananaVLM, arXiv: a general vision-language model used zero-shot on banana disease", "read", "https://arxiv.org/html/2609.25040"),
  fineTunedBanana: fact(92.21, "92.21%", "2026", "BananaVLM, arXiv: fine-tuned model, in-domain (83.28% out-of-domain)", "read", "https://arxiv.org/html/2609.25040"),
  eudrLarge: fact(0, "30 Dec 2026", "2026", "European Commission: EUDR applies to large and medium operators", "checked", "https://trade.ec.europa.eu/access-to-markets/en/news/delay-until-december-2026-and-other-developments-implementation-eudr-regulation"),
  eudrSmall: fact(0, "30 Jun 2027", "2027", "European Commission: EUDR applies to micro and small operators", "checked", "https://trade.ec.europa.eu/access-to-markets/en/news/delay-until-december-2026-and-other-developments-implementation-eudr-regulation"),
  faoMappingCost: fact(0.3, "$0.30", "per farmer", "FAO: 19 societies and 48 washing stations mapped with enumerators' own Android phones", "read", "https://www.fao.org/transparent-supply-chains/detail/detail/from-one-cooperative-to-a-county--how-kenyan-coffee-farmers-are-taking-ownership-of-their-geodata-with-open-foris-ground-and-whisp/en"),
  kenyaGeoMapping: fact(30, "30%", "Sep 2025", "The Farmer's Journal Africa: Kenya coffee geo-mapping, 16 of 33 counties", "read", "https://thefarmersjournal.com/kenya-accelerates-coffee-geo-mapping-to-meet-eudr-deadline-and-protect-kes-90-billion-in-exports/"),
  hubFieldsRight: fact(84, "84 of 94", "3 Oct 2026", "PROGRESS.md: Qwen3.5-2B on 24 synthetic Swahili and English messages", "measured"),
  hubWrongFinal: fact(0, "0", "3 Oct 2026", "PROGRESS.md: wrong final diagnoses with confirm-first, Qwen3.5-2B", "measured"),
  hubModelFile: fact(1.28, "1.28 GB", "3 Oct 2026", "PROGRESS.md: Qwen3.5-2B text-only model file on the hub (1.95 GB with the vision file)", "measured"),
  kikuyuReadAsSwahili: fact(97, "97 of 100", "3 Oct 2026", "docs/evidence.md: Qwen3.5-2B labelled 97 of 100 FLORES-200 Kikuyu sentences as Swahili", "measured"),
  kikuyuGuardCaught: fact(1010, "1,010 of 1,012", "3 Oct 2026", "evals/kikuyu/results.json: Kikuyu guard on FLORES-200 devtest; 0 of 1,012 Swahili and 0 of 1,012 English sentences wrongly flagged", "measured"),
  hubEmulatorSeconds: fact(5, "about 5 s", "3 Oct 2026", "PROGRESS.md: hub SMS round trip per text, Android emulator, not a real phone", "measured"),
  leafRawAccuracy: fact(91.05, "91.05%", "2026", "README, Local coffee-leaf model: 4,571 internal test images, deployed FP16 runtime", "measured"),
  leafAccepted: fact(81.49, "81.49%", "2026", "README: share of internal test images the confidence and quality rules accepted", "measured"),
  leafAcceptedCorrect: fact(93.1, "93.10%", "2026", "README: share of accepted answers that were correct", "measured"),
  leafRustStressAuroc: fact(0.491, "0.491", "2026", "README: AUROC on the 1,120-image rust stress collection", "measured"),
  leafModelBytes: fact(8091596, "7.7 MB", "2026", "README: coffee-leaf.tflite, 8,091,596 bytes", "measured"),
} satisfies Record<string, Fact>;

export type FactKey = keyof typeof facts;

export function sourceLine(...keys: FactKey[]) {
  const unique = [...new Set(keys.map((key) => `${facts[key].source} (${facts[key].year})`))];
  return unique.join("; ");
}
