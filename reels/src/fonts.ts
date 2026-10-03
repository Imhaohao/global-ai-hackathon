import { loadVariableFont as loadArchivo } from "@remotion/google-fonts/Archivo";
import { loadVariableFont as loadAtkinsonNext } from "@remotion/google-fonts/AtkinsonHyperlegibleNext";
import { loadVariableFont as loadAtkinsonMono } from "@remotion/google-fonts/AtkinsonHyperlegibleMono";

// Families and roles are fixed in assets/brand/fonts.ts; this loads them for the renderer.
loadArchivo("normal", { subsets: ["latin"] });
loadAtkinsonNext("normal", { subsets: ["latin"] });
loadAtkinsonMono("normal", { subsets: ["latin"] });
