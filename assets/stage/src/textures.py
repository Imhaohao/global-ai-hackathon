"""Bakes the stage textures with numpy and Pillow. Run with system Python before the Blender build:

    python3 assets/stage/src/textures.py --polyhaven <dir with Poly Haven 1k jpgs> --fonts <dir with Archivo.ttf>

Outputs land in assets/stage/textures/.
"""

import argparse
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

import layout
import terrain
from leafshape import leaf_half_width

OUT = Path(__file__).resolve().parent.parent / "textures"
RNG = np.random.default_rng(11)


def save_rgb(array, name, quality=88):
    image = Image.fromarray(np.clip(array * 255.0, 0, 255).astype(np.uint8))
    image.save(OUT / name, quality=quality)


def hex_rgb(value):
    value = value.lstrip("#")
    return np.array([int(value[i : i + 2], 16) / 255.0 for i in (0, 2, 4)])


def mix(a, b, t):
    t = np.asarray(t)[..., None] if np.ndim(t) else t
    return a * (1.0 - t) + b * t


def value_noise(shape, cell, seed):
    """Smooth value noise: random lattice upsampled with bicubic filtering."""
    rng = np.random.default_rng(seed)
    height, width = shape
    lattice = rng.random((height // cell + 3, width // cell + 3)).astype(np.float32)
    image = Image.fromarray((lattice * 255).astype(np.uint8)).resize(
        ((width // cell + 3) * cell, (height // cell + 3) * cell), Image.BICUBIC
    )
    return np.asarray(image, dtype=np.float32)[:height, :width] / 255.0


def fbm(shape, cell, seed, octaves=4):
    total = np.zeros(shape, dtype=np.float32)
    amplitude, weight = 1.0, 0.0
    for octave in range(octaves):
        total += amplitude * value_noise(shape, max(2, cell >> octave), seed + octave)
        weight += amplitude
        amplitude *= 0.5
    return total / weight


def normal_from_height(heightfield, strength):
    gy, gx = np.gradient(heightfield)
    normal = np.dstack((-gx * strength, gy * strength, np.ones_like(heightfield)))
    normal /= np.linalg.norm(normal, axis=2, keepdims=True)
    return normal * 0.5 + 0.5


# ---------------------------------------------------------------- leaves

def vein_field(u, v):
    """Distance-like field that is 1 on the midrib and lateral veins, falling to 0 between them."""
    midrib = np.exp(-((v - 0.5) / 0.006) ** 2)
    half = leaf_half_width(u)
    across = np.abs(v - 0.5) / np.maximum(half, 1e-3)
    laterals = np.zeros_like(u)
    for start in np.linspace(0.08, 0.86, 10):
        curve_u = start + 0.22 * across ** 1.35
        fade = 1.0 - terrain.smoothstep(0.55, 0.9, across)
        laterals = np.maximum(laterals, np.exp(-((u - curve_u) / 0.0028) ** 2) * fade)
    return np.clip(midrib + 0.45 * laterals, 0, 1)


def leaf_base(width, height, seed):
    v, u = np.mgrid[0:height, 0:width].astype(np.float32)
    u /= width - 1
    v /= height - 1
    veins = vein_field(u, v)
    mottling = fbm((height, width), 64, seed)
    fine = fbm((height, width), 8, seed + 9, octaves=2)
    deep = hex_rgb("#21482a")
    fresh = hex_rgb("#477a33")
    vein_color = hex_rgb("#7d9a45")
    color = mix(deep, fresh, 0.35 * mottling + 0.25 * (1 - np.abs(v - 0.5) * 2))
    color = mix(color, vein_color, 0.75 * veins)
    color *= (0.92 + 0.12 * fine)[..., None]
    relief = -0.8 * veins + 0.25 * mottling + 0.08 * fine
    return u, v, color, relief


def rust_lesions(u, v, count, seed):
    """Orange-powder rust pustules with yellow chlorotic halos. Returns powder, halo and necrosis masks."""
    rng = np.random.default_rng(seed)
    powder = np.zeros_like(u)
    halo = np.zeros_like(u)
    necrosis = np.zeros_like(u)
    aspect = u.shape[1] / u.shape[0]
    for _ in range(count):
        cu = rng.uniform(0.12, 0.9)
        half = float(leaf_half_width(cu))
        cv = 0.5 + rng.uniform(-0.82, 0.82) * half
        radius = rng.choice([rng.uniform(0.010, 0.022), rng.uniform(0.024, 0.05)], p=[0.65, 0.35])
        distance = np.sqrt(((u - cu) * aspect) ** 2 + (v - cv) ** 2) / radius
        wobble = 1.0 + 0.18 * np.sin(np.arctan2(v - cv, u - cu) * rng.integers(3, 7) + rng.uniform(0, 6))
        distance = distance * wobble
        powder = np.maximum(powder, 1.0 - terrain.smoothstep(0.35, 0.62, distance))
        halo = np.maximum(halo, 1.0 - terrain.smoothstep(0.55, 1.35, distance))
        if radius > 0.03 and rng.random() < 0.5:
            necrosis = np.maximum(necrosis, 1.0 - terrain.smoothstep(0.1, 0.3, distance))
    return powder, halo, necrosis


def bake_leaf(width, height, name, lesion_count, seed):
    u, v, color, relief = leaf_base(width, height, seed)
    roughness = np.full(u.shape, 0.34, dtype=np.float32)
    emissive = np.zeros(color.shape, dtype=np.float32)
    if lesion_count:
        powder, halo, necrosis = rust_lesions(u, v, lesion_count, seed + 1)
        grains = value_noise(u.shape, 2, seed + 4)
        speckle = np.clip((grains - 0.45) * 2.4, 0, 1)
        chlorosis = hex_rgb("#c9b437")
        pustule = mix(hex_rgb("#d4581a"), hex_rgb("#ffa63d"), speckle)
        color = mix(color, chlorosis, 0.85 * halo)
        color = mix(color, pustule, powder)
        color = mix(color, hex_rgb("#5a3418"), 0.85 * necrosis)
        relief += 0.9 * powder * (0.5 + speckle) + 0.15 * halo
        roughness = np.maximum(roughness, 0.92 * np.maximum(powder, 0.6 * halo))
        glow = powder * (0.35 + 0.65 * speckle) * (1 - necrosis)
        emissive = glow[..., None] * hex_rgb("#ff7a1f")
        save_rgb(emissive, f"{name}_emissive.jpg", quality=82)
    save_rgb(color, f"{name}_color.jpg")
    save_rgb(normal_from_height(relief, 2.2), f"{name}_normal.jpg", quality=85)
    occlusion_roughness_metal = np.dstack((np.ones_like(roughness), roughness, np.zeros_like(roughness)))
    save_rgb(occlusion_roughness_metal, f"{name}_orm.jpg", quality=85)


# ---------------------------------------------------------------- terrain

def load_tile(directory, name, tile_px, tint=None, gain=1.0):
    image = Image.open(Path(directory) / f"{name}.jpg").convert("RGB").resize((tile_px, tile_px), Image.LANCZOS)
    array = np.asarray(image, dtype=np.float32) / 255.0 * gain
    if tint is not None:
        array = array * tint
    return array


def tiled(tile, shape):
    reps = (shape[0] // tile.shape[0] + 1, shape[1] // tile.shape[1] + 1, 1)
    return np.tile(tile, reps)[: shape[0], : shape[1]]


def tiled_varied(tile, shape, seed):
    """Two tilings at different scales and rotations, blended by noise, so the repeat stops reading as a grid."""
    larger = np.asarray(
        Image.fromarray((tile * 255).clip(0, 255).astype(np.uint8)).resize(
            (int(tile.shape[1] * 1.7), int(tile.shape[0] * 1.7)), Image.BICUBIC
        ),
        dtype=np.float32,
    ) / 255.0
    first = tiled(tile, shape)
    second = tiled(np.rot90(larger), shape)
    mask = terrain.smoothstep(0.35, 0.65, fbm(shape, max(8, shape[0] // 40), seed))[..., None]
    return first * (1 - mask) + second * mask


def bush_shadow_mask(xs, ys, size):
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    span_x = terrain.EXTENT_X[1] - terrain.EXTENT_X[0]
    span_y = terrain.EXTENT_Y[1] - terrain.EXTENT_Y[0]
    bushes = layout.bush_positions() + [{"x": layout.hero_bush()[0], "y": layout.hero_bush()[1], "scale": 1.1}]
    for bush in bushes:
        px = (bush["x"] - terrain.EXTENT_X[0]) / span_x * size
        py = (terrain.EXTENT_Y[1] - bush["y"]) / span_y * size
        radius = 0.95 * bush.get("scale", 1.0) / span_x * size
        draw.ellipse((px - radius, py - radius * 0.8, px + radius, py + radius * 0.8), fill=200)
    for tree in layout.shade_trees():
        px = (tree["x"] - terrain.EXTENT_X[0]) / span_x * size
        py = (terrain.EXTENT_Y[1] - tree["y"]) / span_y * size
        radius = 2.6 / span_x * size
        draw.ellipse((px - radius, py - radius, px + radius, py + radius), fill=120)
    return np.asarray(mask.filter(ImageFilter.GaussianBlur(size / 900)), dtype=np.float32) / 255.0


def bake_terrain(polyhaven, size):
    span_x = terrain.EXTENT_X[1] - terrain.EXTENT_X[0]
    tile_px = int(round(size / span_x * 2.2))
    ys = np.linspace(terrain.EXTENT_Y[1], terrain.EXTENT_Y[0], size, dtype=np.float32)
    xs = np.linspace(terrain.EXTENT_X[0], terrain.EXTENT_X[1], size, dtype=np.float32)
    grid_x, grid_y = np.meshgrid(xs, ys)
    kinds = terrain.surface_kind(grid_x, grid_y)
    shape = grid_x.shape

    tread = tiled_varied(load_tile(polyhaven, "brown_mud_leaves_01", tile_px), shape, 51)
    riser = tiled_varied(load_tile(polyhaven, "cracked_red_ground", tile_px, gain=0.78), shape, 52)
    grass = tiled_varied(load_tile(polyhaven, "aerial_grass_rock", tile_px * 2, tint=np.array([0.78, 1.0, 0.62])), shape, 53)
    packed = tiled_varied(load_tile(polyhaven, "cracked_red_ground", tile_px, gain=1.12), shape, 54)
    broad = fbm(shape, size // 24, 3)[..., None]

    hill_ground = mix(tread, riser, kinds["riser"])
    color = mix(mix(grass, tread, 0.35 * broad[..., 0]), hill_ground, kinds["hill"])
    color = mix(color, packed, np.maximum(kinds["road"], kinds["path"]))

    fraction = kinds["fraction"]
    crease = np.exp(-((fraction - terrain.RISER_START) / 0.035) ** 2) * kinds["hill"]
    lip = np.exp(-((fraction - 0.995) / 0.02) ** 2) * kinds["hill"]
    color *= (1.0 - 0.38 * crease)[..., None]
    color *= (1.0 + 0.12 * lip)[..., None]
    color *= (0.9 + 0.2 * broad)

    shadow = bush_shadow_mask(xs, ys, size)
    color *= (1.0 - 0.55 * shadow)[..., None]

    centre_x, centre_y = layout.COOPERATIVE_CENTRE
    yard = np.clip(1.0 - np.hypot((grid_x - centre_x - 4.0) / 15.0, (grid_y - centre_y) / 6.5), 0, 1)
    color = mix(color, packed * 0.95, terrain.smoothstep(0.0, 0.35, yard))
    save_rgb(color, "terrain_color.jpg", quality=86)


# ---------------------------------------------------------------- props

def bake_keypad(fonts, size=512):
    """Glyph atlas for the feature phone keys: a 4 x 4 grid of cells."""
    image = Image.new("RGB", (size, size), (40, 42, 44))
    draw = ImageDraw.Draw(image)
    font = ImageFont.truetype(str(Path(fonts) / "Archivo.ttf"), int(size / 4 * 0.5))
    try:
        font.set_variation_by_axes([100, 600])
    except OSError:
        pass
    glyphs = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#", "", "", "", ""]
    cell = size // 4
    for index, glyph in enumerate(glyphs):
        cx, cy = (index % 4) * cell + cell / 2, (index // 4) * cell + cell / 2
        draw.text((cx, cy), glyph, fill=(226, 228, 222), font=font, anchor="mm")
    call_cx, call_cy = 0 * cell + cell / 2, 3 * cell + cell / 2
    draw.rounded_rectangle((call_cx - 34, call_cy - 10, call_cx + 34, call_cy + 10), radius=10, fill=(82, 178, 96))
    end_cx = 1 * cell + cell / 2
    draw.rounded_rectangle((end_cx - 34, call_cy - 10, end_cx + 34, call_cy + 10), radius=10, fill=(214, 72, 52))
    image.save(OUT / "keypad_atlas.png")


def bake_burlap(size=512):
    v, u = np.mgrid[0:size, 0:size].astype(np.float32)
    threads = 64
    warp = 0.5 + 0.5 * np.sin(u / size * threads * 2 * np.pi)
    weft = 0.5 + 0.5 * np.sin(v / size * threads * 2 * np.pi)
    checker = (np.floor(u / size * threads) + np.floor(v / size * threads)) % 2
    weave = np.where(checker > 0, warp, weft) ** 0.6
    fibre = fbm((size, size), 6, 21, octaves=2)
    base = mix(hex_rgb("#6f5432"), hex_rgb("#b8955f"), np.clip(weave * 0.75 + 0.25 * fibre, 0, 1))
    save_rgb(base, "burlap_color.jpg")
    save_rgb(normal_from_height(weave * 0.7 + 0.3 * fibre, 3.0), "burlap_normal.jpg")


def bake_grevillea_card(size=512):
    """Fern-like Grevillea foliage spray on an alpha card."""
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    rng = np.random.default_rng(5)
    for _ in range(16):
        x0, y0 = size / 2 + rng.uniform(-60, 60), size * 0.95
        angle = rng.uniform(-0.9, 0.9) - np.pi / 2
        length = rng.uniform(0.55, 0.85) * size
        steps = 26
        for step in range(steps):
            t = step / steps
            x = x0 + np.cos(angle + 0.4 * t) * length * t
            y = y0 + np.sin(angle + 0.4 * t) * length * t
            leaflet = (1 - t) * 34 + 8
            shade = int(rng.uniform(55, 95))
            colour = (shade - 25, shade + 18, shade - 38, 255) if rng.random() < 0.8 else (shade + 40, shade + 52, shade + 30, 255)
            for side in (-1, 1):
                lx = x + side * np.cos(angle + np.pi / 2) * leaflet
                ly = y + side * np.sin(angle + np.pi / 2) * leaflet
                draw.line((x, y, lx, ly), fill=colour, width=5)
            draw.line((x0, y0, x, y), fill=(72, 70, 44, 255), width=3)
    image.save(OUT / "grevillea_card.png")


def bake_banana_leaf(size=512):
    v, u = np.mgrid[0:size, 0:size].astype(np.float32) / (size - 1)
    ribs = 0.5 + 0.5 * np.sin((u * 0.4 + np.abs(v - 0.5)) * 140)
    midrib = np.exp(-((v - 0.5) / 0.02) ** 2)
    tear = fbm((size, size), 16, 31)
    color = mix(hex_rgb("#3f6b25"), hex_rgb("#6f9a3a"), 0.4 * ribs + 0.3 * tear)
    color = mix(color, hex_rgb("#b9c47a"), midrib)
    edge_dry = terrain.smoothstep(0.42, 0.5, np.abs(v - 0.5)) * terrain.smoothstep(0.4, 0.8, tear)
    color = mix(color, hex_rgb("#8a7a3a"), edge_dry)
    save_rgb(color, "banana_leaf_color.jpg")


def bake_parchment(size=512):
    """Coffee parchment drying on a raised bed, seen from above."""
    rng = np.random.default_rng(9)
    image = Image.new("RGB", (size, size), (120, 104, 78))
    draw = ImageDraw.Draw(image)
    for _ in range(5200):
        x, y = rng.uniform(0, size, 2)
        rx, ry = rng.uniform(4, 6), rng.uniform(2.6, 3.6)
        tone = int(rng.uniform(170, 222))
        draw.ellipse((x - rx, y - ry, x + rx, y + ry), fill=(tone, tone - 14, tone - 46))
    image.save(OUT / "parchment_color.jpg", quality=86)


def bake_plaster(size=512):
    noise = fbm((size, size), 48, 41)
    v = np.linspace(0, 1, size)[:, None] * np.ones((1, size))
    color = mix(hex_rgb("#e9e1cf"), hex_rgb("#cfc4ab"), 0.6 * noise)
    band = v > 0.72
    color[band] = mix(hex_rgb("#2f5d63"), hex_rgb("#264c52"), noise[band])
    grime = terrain.smoothstep(0.85, 1.0, v) * (0.5 + 0.5 * noise)
    color = mix(color, hex_rgb("#7a4b30"), 0.45 * grime)
    save_rgb(color, "plaster_color.jpg")


def _leaf_sprite(leaf_texture, length_px, tint, rng):
    """One leaf as an RGBA sprite, stalk at the left-middle, cut to the arabica outline."""
    height_px = max(4, length_px // 2)
    sprite = np.asarray(leaf_texture.resize((length_px, height_px), Image.BILINEAR), dtype=np.float32) / 255.0
    v, u = np.mgrid[0:height_px, 0:length_px].astype(np.float32)
    u /= max(1, length_px - 1)
    v /= max(1, height_px - 1)
    inside = np.abs(v - 0.5) <= leaf_half_width(u)
    alpha = Image.fromarray((inside * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.6))
    shade = 1.0 - 0.25 * np.abs(v - 0.5) / 0.47
    colour = np.clip(sprite * np.asarray(tint) * shade[..., None] * rng.uniform(0.85, 1.1), 0, 1)
    rgba = Image.fromarray((colour * 255).astype(np.uint8)).convert("RGBA")
    rgba.putalpha(alpha)
    return rgba


def _paste_rotated(canvas, sprite, base, angle_degrees, shadow=True):
    rotated = sprite.rotate(angle_degrees, resample=Image.BICUBIC, expand=True)
    w, h = sprite.size
    theta = np.radians(angle_degrees)
    centre_offset = np.array([-w / 2, 0.0])
    rotated_offset = np.array([centre_offset[0] * np.cos(theta), -centre_offset[0] * np.sin(theta)])
    centre = np.array(base) - rotated_offset
    top_left = (int(centre[0] - rotated.size[0] / 2), int(centre[1] - rotated.size[1] / 2))
    if shadow:
        dark = Image.new("RGBA", rotated.size, (8, 20, 6, 0))
        dark.putalpha(rotated.getchannel("A").point(lambda a: int(a * 0.45)).filter(ImageFilter.GaussianBlur(6)))
        canvas.alpha_composite(dark, (top_left[0] + 4, top_left[1] + 7))
    canvas.alpha_composite(rotated, top_left)


def bake_spray(width=1024, height=512, seed=61):
    """A coffee lateral seen from above: a twig with opposite pairs of leaves, on an alpha card.
    The card spans 0.75 m along the twig and 0.375 m across it."""
    rng = np.random.default_rng(seed)
    leaf_texture = Image.open(OUT / "leaf_color.jpg").convert("RGB")
    canvas = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    px_per_m = width / 0.75
    axis_y = height / 2
    draw.line((0, axis_y, width * 0.88, axis_y + 5), fill=(58, 48, 36, 255), width=7)
    nodes = np.arange(0.07, 0.66, 0.058)
    for index, along in enumerate(nodes):
        x = along * px_per_m
        p = along / 0.75
        length_m = rng.uniform(0.11, 0.15) * (1.0 - 0.35 * p) + 0.02
        young = p > 0.86
        tint = (1.05, 1.08, 0.7) if young else (1.0, 1.0, 1.0)
        for side in (-1, 1):
            sprite = _leaf_sprite(leaf_texture, int(length_m * px_per_m), tint, rng)
            angle = side * rng.uniform(34, 72) * (1.0 - 0.3 * p)
            _paste_rotated(canvas, sprite, (x, axis_y + 3 * p), angle)
        if index % 3 == 1 and p < 0.7:
            for _ in range(int(rng.integers(3, 7))):
                cx = x + rng.uniform(-8, 8)
                cy = axis_y + rng.uniform(-9, 9)
                r = rng.uniform(6.5, 8.5)
                red = rng.random() < 0.6
                fill = (128, 22, 18, 255) if red else (92, 124, 44, 255)
                draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=fill)
    tip = _leaf_sprite(leaf_texture, int(0.07 * px_per_m), (1.05, 1.08, 0.7), rng)
    _paste_rotated(canvas, tip, (width * 0.86, axis_y + 5), 0)
    canvas.save(OUT / "coffee_spray.png")


def bake_stone(polyhaven, size=512):
    """A dark, warm field stone, from the Poly Haven dry boulder texture."""
    rock = np.asarray(Image.open(Path(polyhaven) / "rock_boulder_dry.jpg").convert("RGB").resize((size, size), Image.LANCZOS), dtype=np.float32) / 255.0
    save_rgb(rock * np.array([0.5, 0.44, 0.38]), "stone_color.jpg")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--polyhaven", required=True)
    parser.add_argument("--fonts", required=True)
    parser.add_argument("--terrain-size", type=int, default=4096)
    args = parser.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    bake_leaf(2048, 1024, "rust_leaf", lesion_count=34, seed=101)
    bake_leaf(1024, 512, "rust_leaf_b", lesion_count=20, seed=303)
    bake_leaf(1024, 512, "leaf", lesion_count=0, seed=202)
    bake_spray()
    bake_stone(args.polyhaven)
    bake_keypad(args.fonts)
    bake_burlap()
    bake_grevillea_card()
    bake_banana_leaf()
    bake_parchment()
    bake_plaster()
    bake_terrain(args.polyhaven, args.terrain_size)


if __name__ == "__main__":
    main()
