"""Renders a vertical push-in on the shared stage's rust leaf, for the reel's opening frames.

Run on a COPY of assets/stage/coffee-slope.blend (never the original):

    cp assets/stage/coffee-slope.blend /tmp/stage-copy.blend
    /Applications/Blender.app/Contents/MacOS/Blender -b /tmp/stage-copy.blend \
        --python reels/scripts/blender/renderLeafPush.py -- <anchors.json> <out_dir> [frames] [samples]

Writes out_dir/leaf_0001.png ... at 1080x1920.
"""

import json
import sys
from pathlib import Path

import bpy
from mathutils import Vector


def from_three(point):
    x, y, z = point
    return Vector((x, -z, y))


def arguments():
    argv = sys.argv[sys.argv.index("--") + 1 :]
    anchors, out_dir = Path(argv[0]), Path(argv[1])
    frames = int(argv[2]) if len(argv) > 2 else 40
    samples = int(argv[3]) if len(argv) > 3 else 48
    return anchors, out_dir, frames, samples


def configure(scene, samples):
    scene.render.engine = "CYCLES"
    scene.cycles.samples = samples
    scene.cycles.use_denoising = True
    preferences = bpy.context.preferences.addons["cycles"].preferences
    preferences.compute_device_type = "METAL"
    preferences.get_devices()
    for device in preferences.devices:
        device.use = True
    scene.cycles.device = "GPU"
    scene.render.resolution_x = 1080
    scene.render.resolution_y = 1920
    scene.render.resolution_percentage = 100
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.view_settings.exposure = -0.3
    scene.use_nodes = False


def camera(scene, leaf, normal):
    data = bpy.data.cameras.new("ReelLeafPush")
    data.lens = 60
    data.clip_start = 0.005
    data.dof.use_dof = True
    data.dof.aperture_fstop = 2.8
    obj = bpy.data.objects.new("ReelLeafPush", data)
    scene.collection.objects.link(obj)
    scene.camera = obj
    return obj


def main():
    anchors_path, out_dir, frames, samples = arguments()
    anchors = json.loads(anchors_path.read_text())
    leaf = from_three(anchors["rustLeaves"][0]["centre"])
    normal = from_three(anchors["rustLeaves"][0]["normal"]).normalized()
    scene = bpy.context.scene
    configure(scene, samples)
    cam = camera(scene, leaf, normal)
    side = normal.cross(Vector((0, 0, 1))).normalized()
    out_dir.mkdir(parents=True, exist_ok=True)
    for index in range(frames):
        t = index / max(frames - 1, 1)
        eased = 1 - (1 - t) ** 3
        distance = 0.42 - 0.2 * eased
        location = leaf + normal * distance + side * (0.04 - 0.08 * eased) + Vector((0, 0, 0.03))
        cam.location = location
        cam.rotation_euler = (leaf - location).to_track_quat("-Z", "Y").to_euler()
        cam.data.dof.focus_distance = (leaf - location).length
        scene.render.filepath = str(out_dir / f"leaf_{index + 1:04d}.png")
        bpy.ops.render.render(write_still=True)


main()
