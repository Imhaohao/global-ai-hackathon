"""Renders hero stills of the stage from the saved .blend.

    /Applications/Blender.app/Contents/MacOS/Blender -b assets/stage/coffee-slope.blend \
        --python assets/stage/src/render_heroes.py -- [--quick] [--only name,name]

Writes PNGs to assets/stage/renders/. Shots are defined in Blender coordinates (z up).
"""

import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

STAGE = Path(__file__).resolve().parent.parent
RENDERS = STAGE / "renders"
PAPER = (0.925, 0.914, 0.882)


def from_three(point):
    x, y, z = point
    return Vector((x, -z, y))


def shots():
    anchors = json.loads((STAGE / "anchors.json").read_text())
    leaf = from_three(anchors["rustLeaves"][0]["centre"])
    leaf_normal = from_three(anchors["rustLeaves"][0]["normal"])
    feature = from_three(anchors["screens"]["FeaturePhoneScreen"]["centre"])
    hub = from_three(anchors["screens"]["HubPhoneScreen"]["centre"])
    officer = from_three(anchors["screens"]["OfficerPhoneScreen"]["centre"])
    return {
        "wide-slope": {"location": Vector((7.0, -40.0, 7.5)), "target": Vector((0.0, 6.0, 7.0)), "lens": 40},
        "rows": {"location": Vector((-1.0, -9.0, 3.6)), "target": Vector((2.0, 2.0, 4.0)), "lens": 35},
        "rust-leaf-macro": {"location": leaf + leaf_normal * 0.22 + Vector((0.0, -0.08, 0.05)), "target": leaf, "lens": 70, "dof": 0.2},
        "feature-phone": {"location": feature + Vector((-0.12, -0.2, 0.24)), "target": feature, "lens": 60, "dof": 0.3},
        "hub-phone": {"location": hub + Vector((0.05, -0.5, 0.18)), "target": hub, "lens": 55, "dof": 0.5},
        "officer": {"location": officer + Vector((-2.2, -2.6, 0.6)), "target": officer + Vector((0.0, 0.0, -0.4)), "lens": 45},
        "aerial": {"location": Vector((0.0, -30.0, 60.0)), "target": Vector((0.0, 12.0, 4.0)), "lens": 35},
    }


def leaf_shots():
    """One close shot per rust leaf, as the daughter's phone would frame it for the six-leaf scan."""
    anchors = json.loads((STAGE / "anchors.json").read_text())
    result = {}
    for index, leaf in enumerate(anchors["rustLeaves"]):
        centre = from_three(leaf["centre"])
        normal = from_three(leaf["normal"])
        if normal.z < 0:
            normal = -normal
        view = (normal * 0.6 + Vector((0.0, -0.75, 0.15))).normalized()
        result[f"leaf-{index + 1}"] = {"location": centre + view * 0.2, "target": centre, "lens": 50, "dof": 0.2, "fstop": 4.0, "square": True}
    return result


def parse_args():
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    quick = "--quick" in argv
    only = None
    if "--only" in argv:
        only = set(argv[argv.index("--only") + 1].split(","))
    return quick, only


def configure(scene, quick):
    try:
        scene.render.engine = "BLENDER_EEVEE_NEXT" if quick else "CYCLES"
    except TypeError:
        scene.render.engine = "BLENDER_EEVEE"
    if scene.render.engine == "CYCLES":
        scene.cycles.samples = 96
        scene.cycles.use_denoising = True
        preferences = bpy.context.preferences.addons["cycles"].preferences
        preferences.compute_device_type = "METAL"
        preferences.get_devices()
        for device in preferences.devices:
            device.use = True
        scene.cycles.device = "GPU"
    scene.render.resolution_x = 1920 if not quick else 960
    scene.render.resolution_y = 1080 if not quick else 540
    scene.render.film_transparent = False
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.view_settings.exposure = -0.4


def add_mist(scene):
    """Distance mist toward the paper colour, done in the compositor from the mist pass."""
    scene.view_layers[0].use_pass_mist = True
    scene.world.mist_settings.start = 20.0
    scene.world.mist_settings.depth = 160.0
    scene.world.mist_settings.falloff = "QUADRATIC"
    scene.use_nodes = True
    tree = scene.node_tree
    tree.nodes.clear()
    layers = tree.nodes.new("CompositorNodeRLayers")
    mix = tree.nodes.new("CompositorNodeMixRGB")
    mix.inputs[2].default_value = (*PAPER, 1.0)
    output = tree.nodes.new("CompositorNodeComposite")
    tree.links.new(layers.outputs["Mist"], mix.inputs[0])
    tree.links.new(layers.outputs["Image"], mix.inputs[1])
    tree.links.new(mix.outputs[0], output.inputs[0])


def camera_for(scene, name, shot):
    data = bpy.data.cameras.new(f"Shot_{name}")
    data.lens = shot["lens"]
    data.clip_start = 0.01
    data.clip_end = 1000
    if "dof" in shot:
        data.dof.use_dof = True
        data.dof.focus_distance = (shot["target"] - shot["location"]).length
        data.dof.aperture_fstop = shot.get("fstop", 5.6)
    camera = bpy.data.objects.new(f"Shot_{name}", data)
    scene.collection.objects.link(camera)
    camera.location = shot["location"]
    direction = shot["target"] - shot["location"]
    camera.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    return camera


def main():
    quick, only = parse_args()
    scene = bpy.context.scene
    configure(scene, quick)
    add_mist(scene)
    RENDERS.mkdir(exist_ok=True)
    leaves_dir = STAGE / "leaves"
    leaves_dir.mkdir(exist_ok=True)
    plan = [(name, shot, RENDERS) for name, shot in shots().items()] + [(name, shot, leaves_dir) for name, shot in leaf_shots().items()]
    width, height = scene.render.resolution_x, scene.render.resolution_y
    for name, shot, folder in plan:
        if only and name not in only and not ("leaves" in only and folder == leaves_dir):
            continue
        square = shot.get("square", False)
        scene.render.resolution_x, scene.render.resolution_y = (720, 720) if square else (width, height)
        scene.view_settings.exposure = 0.5 if square else -0.4
        scene.camera = camera_for(scene, name, shot)
        scene.render.filepath = str(folder / f"{name}.png")
        bpy.ops.render.render(write_still=True)


main()
