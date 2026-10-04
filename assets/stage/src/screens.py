"""Draws the phone screen textures used on the stage (and swapped per slide in the deck).

    python3 assets/stage/src/screens.py --fonts <dir with AtkinsonNext.ttf and Archivo.ttf>

These are mockups drawn from the real components and real strings:
- feature phone texts: the farmer's message is an example; the reply is SWAHILI_WORDING.confirmFirst for rust,
  exactly as shared/src/smsReply.ts builds it.
- hub screen: layout of hub/App.tsx, ListeningControl, ModelCard and ExchangeCard, colours from hub/src/colors.json.
- officer screen: formatCaseSummarySms from shared/src/caseSummary.ts (branch part-2-rules) run on an example case.
"""

import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parent.parent / "screens"

FARMER_MESSAGE = "Majani yana madoa ya manjano na unga wa machungwa chini ya jani"
CONFIRM_FIRST_REPLY = (
    "Huenda ni Kutu ya majani ya kahawa. Kutu ina unga wa machungwa chini ya jani, lakini doa la jicho la kahawia "
    "lina duara kavu za kahawia zenye katikati ya kijivu-nyeupe na halina unga. Jibu ukieleza unachoona ili tuhakikishe."
)
MODEL_READING = "Yellow spots, orange powder under the leaf"
CASE_SUMMARY = (
    "Leaf Doctor case NY-0412, 2026-10-03. Section: Lower terrace. GPS -0.54800,36.94300 (within 8 m). "
    "Result: not sure, leaves disagree, 5 of 6 leaves clear enough. Decision: needs your visit. "
    "Rain: 4 wet days of last 7 (NASA POWER). Model coffee-leaf 19b4f97."
)

HUB = {
    "paper": "#F6F3EC",
    "surface": "#FFFFFF",
    "sunken": "#ECE7DB",
    "ink": "#1C1A17",
    "muted": "#5B554C",
    "accent": "#1F5135",
    "on_accent": "#FFFFFF",
    "on_accent_muted": "#C9DDD0",
    "reply": "#E3F1E7",
    "live": "#7FD39B",
}
LCD = {"background": "#E8ECDD", "ink": "#1E2418", "muted": "#58604C", "bar": "#1E2418", "on_bar": "#E8ECDD"}


class Fonts:
    def __init__(self, directory):
        self.directory = Path(directory)

    def body(self, size, weight=400):
        font = ImageFont.truetype(str(self.directory / "AtkinsonNext.ttf"), size)
        font.set_variation_by_axes([weight])
        return font

    def display(self, size, weight=800, width=100):
        font = ImageFont.truetype(str(self.directory / "Archivo.ttf"), size)
        font.set_variation_by_axes([width, weight])
        return font


def wrap(draw, text, font, max_width):
    words, lines, line = text.split(), [], ""
    for word in words:
        candidate = f"{line} {word}".strip()
        if draw.textlength(candidate, font=font) <= max_width:
            line = candidate
        else:
            lines.append(line)
            line = word
    if line:
        lines.append(line)
    return lines


def draw_paragraph(draw, origin, text, font, max_width, fill, leading):
    x, y = origin
    for line in wrap(draw, text, font, max_width):
        draw.text((x, y), line, font=font, fill=fill)
        y += leading
    return y


def signal_and_battery(draw, width, y, colour, fonts, time="07:42"):
    for index in range(4):
        h = 8 + index * 6
        draw.rectangle((18 + index * 11, y + 30 - h, 25 + index * 11, y + 30), fill=colour)
    draw.text((width / 2, y + 18), time, font=fonts.body(26, 700), fill=colour, anchor="mm")
    draw.rectangle((width - 70, y + 8, width - 26, y + 30), outline=colour, width=3)
    draw.rectangle((width - 26, y + 14, width - 21, y + 24), fill=colour)
    draw.rectangle((width - 66, y + 12, width - 36, y + 26), fill=colour)


def feature_screen(fonts, name, title, body, footer_left, footer_right, sent=False):
    width, height = 480, 600
    image = Image.new("RGB", (width, height), LCD["background"])
    draw = ImageDraw.Draw(image)
    signal_and_battery(draw, width, 8, LCD["ink"], fonts)
    draw.rectangle((0, 50, width, 104), fill=LCD["bar"])
    draw.text((20, 77), title, font=fonts.body(30, 700), fill=LCD["on_bar"], anchor="lm")
    y = 124
    if sent:
        draw.text((20, y), "To: Leaf Doctor", font=fonts.body(24, 700), fill=LCD["muted"])
        y += 40
    y = draw_paragraph(draw, (20, y), body, fonts.body(27, 500), width - 40, LCD["ink"], 35)
    if sent:
        draw.text((20, y + 14), "Sent", font=fonts.body(24, 700), fill=LCD["muted"])
    draw.rectangle((0, height - 54, width, height), fill=LCD["bar"])
    draw.text((20, height - 27), footer_left, font=fonts.body(26, 700), fill=LCD["on_bar"], anchor="lm")
    draw.text((width - 20, height - 27), footer_right, font=fonts.body(26, 700), fill=LCD["on_bar"], anchor="rm")
    image.save(OUT / f"{name}.png")


def rounded(draw, box, radius, fill):
    draw.rounded_rectangle(box, radius=radius, fill=fill)


def android_status(draw, width, colour, fonts):
    draw.text((32, 34), "7:42", font=fonts.body(26, 700), fill=colour, anchor="lm")
    draw.rectangle((width - 70, 24, width - 34, 44), outline=colour, width=3)
    draw.rectangle((width - 66, 28, width - 44, 40), fill=colour)


def hub_screen(fonts):
    width, height = 540, 1188
    image = Image.new("RGB", (width, height), HUB["paper"])
    draw = ImageDraw.Draw(image)
    android_status(draw, width, HUB["ink"], fonts)
    pad = 24
    draw.text((pad, 88), "Leaf Doctor Hub", font=fonts.body(46, 700), fill=HUB["ink"])
    top = 168
    rounded(draw, (pad, top, width - pad, top + 196), 28, HUB["accent"])
    draw.ellipse((pad + 22, top + 32, pad + 46, top + 56), fill=HUB["live"])
    draw.text((pad + 62, top + 44), "Listening for texts", font=fonts.body(34, 600), fill=HUB["on_accent"], anchor="lm")
    rounded(draw, (pad + 20, top + 100, width - pad - 20, top + 172), 20, HUB["on_accent"])
    draw.text((width / 2, top + 136), "Stop listening", font=fonts.body(28, 700), fill=HUB["accent"], anchor="mm")
    top += 220
    rounded(draw, (pad, top, width - pad, top + 112), 28, HUB["surface"])
    draw.ellipse((pad + 20, top + 36, pad + 58, top + 74), fill=HUB["accent"])
    draw.line((pad + 29, top + 56, pad + 37, top + 64, pad + 50, top + 46), fill=HUB["on_accent"], width=4)
    draw.text((pad + 76, top + 38), "Offline language model ready", font=fonts.body(26, 600), fill=HUB["ink"], anchor="lm")
    draw.text((pad + 76, top + 74), "Qwen3.5-2B, running on the processor", font=fonts.body(21), fill=HUB["muted"], anchor="lm")
    top += 140
    draw.text((pad, top), "Recent texts", font=fonts.body(32, 600), fill=HUB["ink"])
    top += 56
    inner = pad + 22
    text_width = width - 2 * inner
    question_lines = wrap(draw, FARMER_MESSAGE, fonts.body(24), text_width)
    reading_lines = wrap(draw, MODEL_READING, fonts.body(21), text_width - 40)
    reply_font = fonts.body(22)
    reply_lines = wrap(draw, CONFIRM_FIRST_REPLY, reply_font, text_width - 32)
    reading_top = top + 70 + 32 * len(question_lines) + 10
    reply_top = reading_top + 28 * len(reading_lines) + 14
    reply_bottom = reply_top + 28 * len(reply_lines) + 28
    rounded(draw, (pad, top, width - pad, reply_bottom + 22), 28, HUB["surface"])
    draw.text((inner, top + 36), "Phone ending 4821", font=fonts.body(28, 600), fill=HUB["ink"], anchor="lm")
    draw.text((width - pad - 70, top + 36), "7:42 AM", font=fonts.body(21), fill=HUB["muted"], anchor="rm")
    _wifi_slash(draw, (width - pad - 40, top + 36), HUB["muted"])
    draw_paragraph(draw, (inner, top + 70), FARMER_MESSAGE, fonts.body(24), text_width, HUB["ink"], 32)
    draw.text((inner, reading_top), "Aa", font=fonts.body(20, 700), fill=HUB["muted"])
    draw_paragraph(draw, (inner + 40, reading_top), MODEL_READING, fonts.body(21), text_width - 40, HUB["muted"], 28)
    rounded(draw, (inner, reply_top, width - inner, reply_bottom), 20, HUB["reply"])
    draw_paragraph(draw, (inner + 16, reply_top + 14), CONFIRM_FIRST_REPLY, reply_font, text_width - 32, HUB["ink"], 28)
    image.save(OUT / "hub-exchange.png")


def _wifi_slash(draw, centre, colour):
    x, y = centre
    for radius in (16, 10):
        draw.arc((x - radius, y - radius + 6, x + radius, y + radius + 6), 220, 320, fill=colour, width=3)
    draw.ellipse((x - 3, y + 6, x + 3, y + 12), fill=colour)
    draw.line((x - 14, y - 10, x + 14, y + 16), fill=colour, width=3)


def officer_screen(fonts):
    width, height = 540, 1188
    image = Image.new("RGB", (width, height), "#FFFFFF")
    draw = ImageDraw.Draw(image)
    android_status(draw, width, HUB["ink"], fonts)
    draw.rectangle((0, 64, width, 160), fill=HUB["paper"])
    draw.ellipse((24, 84, 80, 140), fill=HUB["accent"])
    draw.text((52, 112), "LD", font=fonts.body(24, 700), fill=HUB["on_accent"], anchor="mm")
    draw.text((100, 96), "Leaf Doctor hub", font=fonts.body(30, 700), fill=HUB["ink"])
    draw.text((100, 130), "Cooperative number", font=fonts.body(20), fill=HUB["muted"])
    font = fonts.body(25)
    lines = wrap(draw, CASE_SUMMARY, font, width - 120)
    top = 210
    rounded(draw, (24, top, width - 60, top + 34 * len(lines) + 36), 26, HUB["sunken"])
    draw_paragraph(draw, (44, top + 18), CASE_SUMMARY, font, width - 120, HUB["ink"], 34)
    draw.text((28, top + 34 * len(lines) + 56), "7:44 AM", font=fonts.body(20), fill=HUB["muted"])
    image.save(OUT / "officer-case.png")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--fonts", required=True)
    args = parser.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    fonts = Fonts(args.fonts)
    feature_screen(fonts, "feature-sent", "New message", FARMER_MESSAGE, "Options", "Back", sent=True)
    feature_screen(fonts, "feature-reply", "Leaf Doctor", CONFIRM_FIRST_REPLY, "Reply", "Back")
    feature_screen(fonts, "feature-idle", "Messages", "1 new message from Leaf Doctor", "Open", "Back")
    hub_screen(fonts)
    officer_screen(fonts)


if __name__ == "__main__":
    main()
