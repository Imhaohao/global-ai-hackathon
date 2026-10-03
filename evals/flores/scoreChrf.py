"""Score the translations in results.json against FLORES-200 English references with chrF.

Run after runFlores.ts:
  uv run --no-project --with sacrebleu python evals/flores/scoreChrf.py <path to extracted flores200_dataset>

"copySourceChrf" scores the untranslated source sentence against the English reference.
It shows how much of the score a model would get by copying names and numbers through.
"""
import json
import pathlib
import sys

import sacrebleu

RESULTS = pathlib.Path(__file__).parent / "results.json"
LANGUAGE_BLOCKS = {"kikuyu": "kik_Latn", "swahili": "swh_Latn"}


def devtest_lines(flores_dir: pathlib.Path, code: str) -> list[str]:
    return (flores_dir / "devtest" / f"{code}.devtest").read_text(encoding="utf-8").rstrip("\n").split("\n")


def chrf(hypotheses: list[str], references: list[str]) -> float:
    return round(sacrebleu.corpus_chrf(hypotheses, [references]).score, 2)


def main() -> None:
    flores_dir = pathlib.Path(sys.argv[1])
    results = json.loads(RESULTS.read_text(encoding="utf-8"))
    ids = results["dataset"]["sentenceIdsOneBased"]
    english = devtest_lines(flores_dir, "eng_Latn")
    references = [english[i - 1] for i in ids]
    for block, code in LANGUAGE_BLOCKS.items():
        sources = devtest_lines(flores_dir, code)
        translations = [sentence["translation"] for sentence in results[block]["sentences"]]
        results[block]["chrf"] = chrf(translations, references)
        results[block]["copySourceChrf"] = chrf([sources[i - 1] for i in ids], references)
        print(block, "chrF", results[block]["chrf"], "copy-source chrF", results[block]["copySourceChrf"])
    results["scoring"] = {"metric": "chrF (sacrebleu corpus_chrf, default char order 6, beta 2)", "sacrebleu": sacrebleu.__version__}
    RESULTS.write_text(json.dumps(results, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
