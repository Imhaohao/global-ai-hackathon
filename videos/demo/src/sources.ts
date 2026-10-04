// Every piece of outside footage the video uses, with its licence. scripts/prepareMedia.ts downloads and trims these,
// and scripts/writeCredits.ts prints them into out/DemoVideo-credits.txt.
export type FootageSource = {
  file: string;
  title: string;
  author: string;
  page: string;
  download: string;
  licence: string;
  trimStart: number;
  seconds: number;
};

const PEXELS_LICENCE = "Pexels License (free to use, no attribution required; credited anyway)";

export const FOOTAGE: FootageSource[] = [
  {
    file: "video/highlands.mp4",
    title: "Serene Aerial View of Misty Countryside Landscape",
    author: "henok deriba",
    page: "https://www.pexels.com/video/serene-aerial-view-of-misty-countryside-landscape-33001549/",
    download: "https://videos.pexels.com/video-files/33001549/14069338_1920_1080_30fps.mp4",
    licence: PEXELS_LICENCE,
    trimStart: 4,
    seconds: 8,
  },
  {
    file: "video/coffee-rain.mp4",
    title: "Coffee plants growing in the rainforest",
    author: "Diego Castro Calderon",
    page: "https://www.pexels.com/video/coffee-plants-growing-in-the-rainforest-27638494/",
    download: "https://videos.pexels.com/video-files/27638494/12191440_1920_1080_30fps.mp4",
    licence: PEXELS_LICENCE,
    trimStart: 0,
    seconds: 3.3,
  },
  {
    file: "video/coffee-leaves.mp4",
    title: "Close-Up of Green Coffee Beans on Plant",
    author: "Mario Spencer",
    page: "https://www.pexels.com/video/close-up-of-green-coffee-beans-on-plant-33516244/",
    download: "https://videos.pexels.com/video-files/33516244/14254483_1920_1080_24fps.mp4",
    licence: PEXELS_LICENCE,
    trimStart: 0,
    seconds: 5,
  },
  {
    file: "video/basic-phone.mp4",
    title: "Close-up View Of An Old Nokia Mobile Phone",
    author: "Parth Patel",
    page: "https://www.pexels.com/video/close-up-view-of-an-old-nokia-mobile-phone-3878355/",
    download: "https://videos.pexels.com/video-files/3878355/3878355-hd_1920_1080_30fps.mp4",
    licence: PEXELS_LICENCE,
    trimStart: 1,
    seconds: 6,
  },
  {
    file: "video/coffee-rows.mp4",
    title: "Drone Footage of a Coffee Plantation",
    author: "Thiago Zanutim Lucas",
    page: "https://www.pexels.com/video/drone-footage-of-a-coffee-plantation-12493599/",
    download: "https://videos.pexels.com/video-files/12493599/12493599-hd_2048_1080_24fps.mp4",
    licence: PEXELS_LICENCE,
    trimStart: 0,
    seconds: 6,
  },
  {
    file: "video/field-rain.mp4",
    title: "A Rain Pouring on a Green Field",
    author: "Jyoti Pur",
    page: "https://www.pexels.com/video/a-rain-pouring-on-a-green-field-5918480/",
    download: "https://videos.pexels.com/video-files/5918480/5918480-hd_1920_1080_30fps.mp4",
    licence: PEXELS_LICENCE,
    trimStart: 0,
    seconds: 4,
  },
  {
    file: "video/coffee-farm.mp4",
    title: "Lush Coffee Plantation in Costa Rica",
    author: "Mario Spencer",
    page: "https://www.pexels.com/video/lush-coffee-plantation-in-costa-rica-34695412/",
    download: "https://videos.pexels.com/video-files/34695412/14705455_1920_1080_24fps.mp4",
    licence: PEXELS_LICENCE,
    trimStart: 1,
    seconds: 7,
  },
];

/** The team's own iPhone screen recordings of the app and the SMS bot. Paths are on the recording laptop. */
export const RECORDINGS = [
  { file: "video/rec-scan.mp4", source: "~/Downloads/ScreenRecording_10-03-2026 22-23-18_1.MP4", what: "Leaf scan to the coffee leaf rust action card, iPhone" },
  { file: "video/rec-seed.mp4", source: "~/Downloads/ScreenRecording_10-03-2026 22-33-02_1.MP4", what: "Seed packet barcode check against the demo registry, then the KEPHIS 1393 steps, iPhone" },
  { file: "video/rec-sms.mp4", source: "~/Downloads/ScreenRecording_10-03-2026 22-52-31_1.mov", what: "Real iMessage conversation with the Leaf Doctor SMS bot, iPhone" },
] as const;
