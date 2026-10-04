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

/** The team's own iPhone screen recordings. Paths are on the recording laptop. */
export const RECORDINGS = [
  { file: "video/rec-scan.mp4", source: "~/Downloads/ScreenRecording_10-03-2026 22-23-18_1.MP4", what: "Leaf scan to the coffee leaf rust result, iPhone" },
] as const;

/** Text copied word for word from a recording rather than shown from it. */
export const TRANSCRIBED = {
  source: "~/Downloads/ScreenRecording_10-03-2026 22-52-31_1.mov",
  what: "Noor's question and the bot's brown eye spot reply on the basic phone's screen are copied from this real SMS conversation",
} as const;

export type PhotoSource = { file: string; title: string; author: string; page: string; licence: string };

export const PHOTOS: PhotoSource[] = [
  {
    file: "images/field-officer.jpg",
    title: "Agricultural Field Advisor ( Extension worker)",
    author: "Davie Binali",
    page: "https://commons.wikimedia.org/wiki/File:Agricultural_Field_Advisor_(_Extension_worker).jpg",
    licence: "CC BY-SA 4.0",
  },
];
