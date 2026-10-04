import { loadFont as loadAlegreya } from "@remotion/google-fonts/Alegreya";
import { loadVariableFont as loadAtkinsonMono } from "@remotion/google-fonts/AtkinsonHyperlegibleMono";

// Alegreya is the user's choice for every display and body line in both videos; the mono face is kept only for
// real code, JSON and figures that align in a column. The families are named once, in theme.css.
loadAlegreya("normal", { weights: ["400", "500", "700", "800", "900"], subsets: ["latin"] });
loadAlegreya("italic", { weights: ["400", "700"], subsets: ["latin"] });
loadAtkinsonMono("normal", { subsets: ["latin"] });
