import { loadFont as loadAlegreya } from "@remotion/google-fonts/Alegreya";
import { loadFont as loadAtkinsonMono } from "@remotion/google-fonts/AtkinsonHyperlegibleMono";

// Alegreya sets every display and body line (the user's choice for both videos). The mono face is kept only for the
// basic phone's LCD, which shows raw SMS text the way a phone's own screen font would.
loadAlegreya("normal", { weights: ["400", "500", "700", "800", "900"], subsets: ["latin"] });
loadAlegreya("italic", { weights: ["400", "700"], subsets: ["latin"] });
loadAtkinsonMono("normal", { weights: ["400", "600", "700"], subsets: ["latin"] });
