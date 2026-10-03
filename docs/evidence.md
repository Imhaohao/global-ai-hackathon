# Evidence: Kenya numbers for the pitch

Every number below was fetched on 2026-10-03 from the source named in its row. "Year" is the year the data describes, not the year it was published. Quote the number with its year.

## World Development Indicators (World Bank)

Fetched from the World Bank API, latest year with a value (`mrnev=1`). The API reported the indicators as last updated 2026-07-13.

| Measure | Kenya | Year | Source |
|---|---|---|---|
| Rural population, % of total population | 67.8% | 2025 | [SP.RUR.TOTL.ZS](https://api.worldbank.org/v2/country/KEN/indicator/SP.RUR.TOTL.ZS?format=json&mrnev=1) |
| Mobile cellular subscriptions per 100 people | 126.5 | 2024 | [IT.CEL.SETS.P2](https://api.worldbank.org/v2/country/KEN/indicator/IT.CEL.SETS.P2?format=json&mrnev=1) |
| Employment in agriculture, % of total employment (modelled ILO estimate) | 45.8% | 2025 | [SL.AGR.EMPL.ZS](https://api.worldbank.org/v2/country/KEN/indicator/SL.AGR.EMPL.ZS?format=json&mrnev=1) |
| Access to electricity, % of rural population | 67.1% | 2024 | [EG.ELC.ACCS.RU.ZS](https://api.worldbank.org/v2/country/KEN/indicator/EG.ELC.ACCS.RU.ZS?format=json&mrnev=1) |

Subscriptions above 100 per 100 people count SIM cards, not people. Many Kenyans carry two SIMs, so this number does not mean everyone has a phone. Use the Findex phone ownership row below for people.

## Global Findex (World Bank)

Fetched from the World Bank API, source 28 ("Global Findex database"). The survey year is 2024; the World Bank published it as Global Findex 2025. Base: adults aged 15 and over.

| Measure | All adults | Women | Men | Rural | Source |
|---|---|---|---|---|---|
| Has a mobile money account | 87.5% | 83.5% | 91.7% | 85.7% | [mobileaccount.t.d](https://api.worldbank.org/v2/country/KEN/indicator/mobileaccount.t.d?format=json&source=28) (women `.1`, men `.2`, rural `.9`) |
| Owns a mobile phone | 92.7% | 91.8% | 93.7% | 91.5% | [con1](https://api.worldbank.org/v2/country/KEN/indicator/con1?format=json&source=28) |
| Main phone is a smartphone | 54.9% | 48.8% | 61.3% | 52.8% | [con9a](https://api.worldbank.org/v2/country/KEN/indicator/con9a?format=json&source=28) |
| Main phone is a basic text phone | 37.6% | 43.0% | 32.0% | 38.4% | [con9b](https://api.worldbank.org/v2/country/KEN/indicator/con9b.1?format=json&source=28) |

Mobile money accounts have grown since earlier Findex rounds. For women the share was 54.9% in 2014, 69.4% in 2017, 66.0% in 2021 and 83.5% in 2024 (same indicator, `mobileaccount.t.d.1`).

What it means for Leaf Doctor: about half of rural adults use a smartphone as their main phone, and about four in ten rural adults use a basic text phone. The SMS path is needed for that second group, not added as a fallback.

## GSMA Mobile Gender Gap Report 2025

Opened the full report PDF (GSMA, May 2025; [landing page](https://www.gsma.com/gender-gap-2025/)). gsma.com returned 403 to scripted downloads, so the PDF was read from the Internet Archive copy of GSMA's own file: [web.archive.org snapshot of 15 May 2025](https://web.archive.org/web/20250515054435/https://www.gsma.com/r/wp-content/uploads/2025/05/The-Mobile-Gender-Gap-Report-2025.pdf) (SHA-256 `935c492e2cc68d20b804dca1738e00ffd93291a9c395124333931e580d16c9d7`).

Figure 2 (printed page 20, PDF page 17) is from the GSMA Consumer Survey 2024. Base: total population aged 18+.

| Measure, Kenya 2024 | Men | Women | Gender gap |
|---|---|---|---|
| Mobile ownership | 95% | 93% | 2% |
| Smartphone ownership | 50% | 42% | 16% |
| Mobile internet adoption | 55% | 43% | 22% |

Correction: `docs/research-sources.md` listed "Kenya women's smartphone ownership 39% (2024)". That is wrong. In the report, the rise from 32% in 2023 to 39% in 2024 describes women in **Nigeria** (PDF page 15). The Kenya figure is **42%**.

GSMA's 42% and Findex's 48.8% measure different things. GSMA counts women aged 18+ who own a smartphone; Findex counts women aged 15+ whose main phone is a smartphone. Quote each with its own source and definition.

## WorldPop: people within 10 km of two coffee areas

Source: WorldPop Kenya 2020 constrained population, 100 m grid ([dataset page, DOI 10.5258/SOTON/WP00682](https://hub.worldpop.org/geodata/summary?id=49643); [raster](https://data.worldpop.org/GIS/Population/Global_2000_2020_Constrained/2020/maxar_v1/KEN/ken_ppp_2020_constrained.tif), 34,539,612 bytes, SHA-256 `e1969beb192b3854fac9090e9da63a64202ba60a89c6af67cbd797ae49562550`). "Constrained" means people are placed only on grid cells with mapped buildings. The script `evals/worldpop/countPopulation.py` adds up every settled cell whose centre lies within 10 km (great-circle distance) of each point.

| Place | Point | People within 10 km | Year |
|---|---|---|---|
| Ruiru, Kiambu | -1.146, 36.961 | 624,388 | 2020 |
| Othaya, Nyeri | -0.548, 36.943 | 206,191 | 2020 |

These are **total population, not farmers**. Ruiru sits on the edge of Nairobi, so most of its 624,388 people live in towns. Othaya is rural highland, closer to Noor's setting. The honest way to say it: a cooperative hub phone in a place like Othaya sits among about 200,000 people within 10 km. How many of them grow coffee is not measured here; it would need county coffee registration data.

## Kikuyu and Swahili

Measured on 2026-10-03 with the hub's active language model, Qwen3.5 2B (Q4_K_M, weights SHA-256 `aaf42c8b...9223`), served by llama-server on a laptop at temperature 0. Data: 100 sentences from the FLORES-200 devtest set ([download](https://dl.fbaipublicfiles.com/nllb/flores200_dataset.tar.gz), tarball SHA-256 `b8b0b767...11f6`; CC-BY-SA 4.0 per the [FLORES README](https://github.com/facebookresearch/flores/blob/main/README.md#licenses), since the tarball has no licence file). The sentences are numbers 1, 11, 21 and so on up to 991, the same sentences in each language. FLORES sentences come from Wikinews, Wikibooks and Wikivoyage, so they are news-style and general-interest text, not farmer messages. Script: `evals/flores/runFlores.ts` and `evals/flores/scoreChrf.py`; every sentence's output is in `evals/flores/results.json`.

**Language routing.** `parseFarmerMessage` labels each message `sw`, `en`, `mixed` or `other`, and the hub would send `other` to a person.

| Read as | Kikuyu (100) | Swahili (100) |
|---|---|---|
| `sw` | 97 | 95 |
| `en` | 3 | 5 |
| `mixed` | 0 | 0 |
| `other` | 0 | 0 |

The model read 0 of 100 Kikuyu sentences as `other`. It called 97 of them Swahili, so the hub would answer a Kikuyu speaker as if she had written Swahili instead of passing her to a person. Swahili was read as `sw` 95 times. The 5 `en` labels went to ordinary Swahili sentences, several of which mention foreign place names such as Johannesburg or Singapore. Routing on the model's language label alone does not protect Kikuyu speakers.

**Understanding.** The same model translated each sentence to English, scored against the FLORES English reference with chrF (character n-gram overlap, 0 to 100; sacrebleu 2.6.0). "Copy the source" scores the untranslated sentence, which still gets credit for shared names and numbers.

| | Kikuyu | Swahili |
|---|---|---|
| chrF of the model's translation | 18.31 | 41.04 |
| chrF of copying the source unchanged | 21.64 | 18.13 |

For Kikuyu the model's English scores below simply copying the Kikuyu sentence, so it understood close to nothing. In 32 of 100 Kikuyu outputs the "translation" still contains the Kikuyu letters ĩ or ũ, so the model left the sentence partly untranslated. Other outputs are fluent English that the source does not say: sentence 1 is about diabetic mice, and the model turned it into a list of body parts. Swahili is understood partly, at 41.04. That fits the earlier finding in `PROGRESS.md` that the model's Swahili translations are partly right but invent details.

What it means for Leaf Doctor: Kikuyu is a measured gap. A Kikuyu text to the hub needs a rule-based check for Kikuyu words, or a default of sending unrecognised Swahili-looking text to a person, before the model's label can be trusted.

## Not done

- **OpenCelliD tower counts.** Skipped: the API needs a free key tied to an account, and no key was available. A person needs to sign up at opencellid.org and run the count for Ruiru (-1.146, 36.961) and Othaya (-0.548, 36.943).
- **LSMS-ISA Uganda National Panel Survey.** Skipped: the World Bank Microdata Library needs a free registration and a data request. Next step for a person.
