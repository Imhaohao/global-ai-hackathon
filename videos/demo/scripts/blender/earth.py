"""Builds a night-side Earth with NASA textures and renders the demo video's 1920x1080 orbit dive onto Kenya's coffee highlands.
Adapted from reels/scripts/blender/earth.py: landscape frame, no network arcs, one rust spore over Othaya.

    /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup --python videos/demo/scripts/blender/earth.py -- \
        <textures_dir> <out_dir> intro [frames]

Textures (NASA, public domain), expected in textures_dir:
  world.topo.200412.3x5400x2700.jpg  Blue Marble Next Generation, December (visibleearth.nasa.gov/images/74518)
  BlackMarble_2016_3km.jpg           Black Marble 2016 city lights (visibleearth.nasa.gov/images/144898)
  cloud_combined_2048.jpg            Blue Marble clouds (visibleearth.nasa.gov/images/57747)

Writes out_dir/intro_0001.png ... at 1920x1080.
"""

import math
import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Vector

SUN_LON, SUN_LAT = -75.0, 10.0
RUST = (1.0, 0.39, 0.12)
SPORE = (1.0, 0.7, 0.28)

TOWNS = {
    "nairobi": (-1.286, 36.817),
    "kiambu": (-1.171, 36.835),
    "thika": (-1.033, 37.069),
    "muranga": (-0.721, 37.153),
    "nyeri": (-0.420, 36.947),
    "othaya": (-0.548, 36.943),
    "kerugoya": (-0.499, 37.280),
    "embu": (-0.531, 37.450),
    "meru": (0.047, 37.649),
    "machakos": (-1.517, 37.263),
    "kisii": (-0.677, 34.766),
    "kericho": (-0.367, 35.283),
    "bungoma": (0.564, 34.561),
}


KENYA = (-0.6, 37.0)


def direction(lat, lon):
    la, lo = math.radians(lat), math.radians(lon)
    return Vector((math.cos(la) * math.cos(lo), math.cos(la) * math.sin(lo), math.sin(la)))


def arguments():
    argv = sys.argv[sys.argv.index("--") + 1 :]
    frames = int(argv[3]) if len(argv) > 3 else 80
    preview = [int(value) for value in argv[4].split(",")] if len(argv) > 4 else []
    return Path(argv[0]), Path(argv[1]), argv[2], frames, preview


def image(textures, name, colour=True):
    img = bpy.data.images.load(str(textures / name))
    if not colour:
        img.colorspace_settings.name = "Non-Color"
    return img


def equirect_uv(nodes, links):
    """Object-space position to longitude/latitude texture coordinates (u = lon/360 + 0.5, v = lat/180 + 0.5)."""
    coords = nodes.new("ShaderNodeTexCoord")
    normalise = nodes.new("ShaderNodeVectorMath")
    normalise.operation = "NORMALIZE"
    links.new(coords.outputs["Object"], normalise.inputs[0])
    xyz = nodes.new("ShaderNodeSeparateXYZ")
    links.new(normalise.outputs[0], xyz.inputs[0])
    lon = nodes.new("ShaderNodeMath")
    lon.operation = "ARCTAN2"
    links.new(xyz.outputs["Y"], lon.inputs[0])
    links.new(xyz.outputs["X"], lon.inputs[1])
    u = nodes.new("ShaderNodeMath")
    u.operation = "MULTIPLY_ADD"
    links.new(lon.outputs[0], u.inputs[0])
    u.inputs[1].default_value = 1 / (2 * math.pi)
    u.inputs[2].default_value = 0.5
    lat = nodes.new("ShaderNodeMath")
    lat.operation = "ARCSINE"
    links.new(xyz.outputs["Z"], lat.inputs[0])
    v = nodes.new("ShaderNodeMath")
    v.operation = "MULTIPLY_ADD"
    links.new(lat.outputs[0], v.inputs[0])
    v.inputs[1].default_value = 1 / math.pi
    v.inputs[2].default_value = 0.5
    uv = nodes.new("ShaderNodeCombineXYZ")
    links.new(u.outputs[0], uv.inputs["X"])
    links.new(v.outputs[0], uv.inputs["Y"])
    return uv.outputs[0], normalise.outputs[0]


def sunlit_factor(nodes, links, normal, sharpness=6.0, offset=0.0):
    """0 on the night side, 1 in daylight, from the dot product of the surface normal and the sun direction."""
    sun = nodes.new("ShaderNodeCombineXYZ")
    sun_dir = direction(SUN_LAT, SUN_LON)
    sun.inputs["X"].default_value, sun.inputs["Y"].default_value, sun.inputs["Z"].default_value = sun_dir
    dot = nodes.new("ShaderNodeVectorMath")
    dot.operation = "DOT_PRODUCT"
    links.new(normal, dot.inputs[0])
    links.new(sun.outputs[0], dot.inputs[1])
    scaled = nodes.new("ShaderNodeMath")
    scaled.operation = "MULTIPLY_ADD"
    scaled.use_clamp = True
    links.new(dot.outputs["Value"], scaled.inputs[0])
    scaled.inputs[1].default_value = sharpness
    scaled.inputs[2].default_value = 0.5 + offset
    return scaled.outputs[0]


def earth_material(textures):
    mat = bpy.data.materials.new("Earth")
    mat.use_nodes = True
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    nodes.clear()
    uv, normal = equirect_uv(nodes, links)
    day = nodes.new("ShaderNodeTexImage")
    day.image = image(textures, "world.topo.200412.3x5400x2700.jpg")
    night = nodes.new("ShaderNodeTexImage")
    night.image = image(textures, "BlackMarble_2016_3km.jpg")
    for tex in (day, night):
        tex.interpolation = "Cubic"
        links.new(uv, tex.inputs["Vector"])
    lights_curve = nodes.new("ShaderNodeMath")
    lights_curve.operation = "POWER"
    separate = nodes.new("ShaderNodeRGBToBW")
    links.new(night.outputs["Color"], separate.inputs[0])
    links.new(separate.outputs[0], lights_curve.inputs[0])
    lights_curve.inputs[1].default_value = 1.7
    warm = nodes.new("ShaderNodeMixRGB")
    warm.blend_type = "MULTIPLY"
    warm.inputs[0].default_value = 1.0
    warm.inputs[2].default_value = (1.0, 0.72, 0.42, 1.0)
    links.new(night.outputs["Color"], warm.inputs[1])
    lit = sunlit_factor(nodes, links, normal)
    dark = nodes.new("ShaderNodeMath")
    dark.operation = "SUBTRACT"
    dark.inputs[0].default_value = 1.0
    links.new(lit, dark.inputs[1])
    strength = nodes.new("ShaderNodeMath")
    strength.operation = "MULTIPLY"
    links.new(dark.outputs[0], strength.inputs[0])
    links.new(lights_curve.outputs[0], strength.inputs[1])
    gain = nodes.new("ShaderNodeMath")
    gain.operation = "MULTIPLY"
    links.new(strength.outputs[0], gain.inputs[0])
    gain.inputs[1].default_value = 28.0
    bsdf = nodes.new("ShaderNodeBsdfPrincipled")
    links.new(day.outputs["Color"], bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = 0.7
    links.new(warm.outputs[0], bsdf.inputs["Emission Color"])
    links.new(gain.outputs[0], bsdf.inputs["Emission Strength"])
    moonlight = nodes.new("ShaderNodeEmission")
    links.new(day.outputs["Color"], moonlight.inputs["Color"])
    moonlight.inputs["Strength"].default_value = 0.05
    add = nodes.new("ShaderNodeAddShader")
    links.new(bsdf.outputs[0], add.inputs[0])
    links.new(moonlight.outputs[0], add.inputs[1])
    out = nodes.new("ShaderNodeOutputMaterial")
    links.new(add.outputs[0], out.inputs["Surface"])
    return mat


def cloud_material(textures):
    mat = bpy.data.materials.new("Clouds")
    mat.use_nodes = True
    mat.blend_method = "BLEND"
    mat.shadow_method = "NONE"
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    nodes.clear()
    uv, normal = equirect_uv(nodes, links)
    tex = nodes.new("ShaderNodeTexImage")
    tex.image = image(textures, "cloud_combined_2048.jpg", colour=False)
    links.new(uv, tex.inputs["Vector"])
    bsdf = nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Base Color"].default_value = (0.95, 0.95, 0.97, 1)
    alpha = nodes.new("ShaderNodeMath")
    alpha.operation = "MULTIPLY"
    links.new(tex.outputs["Color"], alpha.inputs[0])
    alpha.inputs[1].default_value = 0.65
    links.new(alpha.outputs[0], bsdf.inputs["Alpha"])
    out = nodes.new("ShaderNodeOutputMaterial")
    links.new(bsdf.outputs[0], out.inputs["Surface"])
    return mat


def atmosphere_material():
    """A thin rim of blue light: strongest at grazing angles and on the sunlit side."""
    mat = bpy.data.materials.new("Atmosphere")
    mat.use_nodes = True
    mat.blend_method = "BLEND"
    mat.shadow_method = "NONE"
    mat.use_backface_culling = True
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    nodes.clear()
    weight = nodes.new("ShaderNodeLayerWeight")
    weight.inputs["Blend"].default_value = 0.5
    rim = nodes.new("ShaderNodeMath")
    rim.operation = "POWER"
    links.new(weight.outputs["Facing"], rim.inputs[0])
    rim.inputs[1].default_value = 5.0
    coords = nodes.new("ShaderNodeTexCoord")
    normalise = nodes.new("ShaderNodeVectorMath")
    normalise.operation = "NORMALIZE"
    links.new(coords.outputs["Object"], normalise.inputs[0])
    lit = sunlit_factor(nodes, links, normalise.outputs[0], sharpness=2.0, offset=0.15)
    glow = nodes.new("ShaderNodeMath")
    glow.operation = "MULTIPLY"
    glow.use_clamp = True
    links.new(rim.outputs[0], glow.inputs[0])
    links.new(lit, glow.inputs[1])
    emission = nodes.new("ShaderNodeEmission")
    emission.inputs["Color"].default_value = (0.3, 0.55, 1.0, 1)
    emission.inputs["Strength"].default_value = 2.5
    transparent = nodes.new("ShaderNodeBsdfTransparent")
    mix = nodes.new("ShaderNodeMixShader")
    links.new(glow.outputs[0], mix.inputs[0])
    links.new(transparent.outputs[0], mix.inputs[1])
    links.new(emission.outputs[0], mix.inputs[2])
    out = nodes.new("ShaderNodeOutputMaterial")
    links.new(mix.outputs[0], out.inputs["Surface"])
    return mat


def emission_material(name, colour, strength):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    nodes.clear()
    emission = nodes.new("ShaderNodeEmission")
    emission.inputs["Color"].default_value = (*colour, 1)
    emission.inputs["Strength"].default_value = strength
    out = nodes.new("ShaderNodeOutputMaterial")
    links.new(emission.outputs[0], out.inputs["Surface"])
    return mat


def sphere(name, radius, material, segments=256):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=segments // 2, radius=radius)
    obj = bpy.context.active_object
    obj.name = name
    bpy.ops.object.shade_smooth()
    obj.data.materials.append(material)
    return obj


def spore(material, hide_from):
    """One glowing rust spore over Othaya, the brand motif, gone before the camera reaches the clouds."""
    lat, lon = TOWNS["othaya"]
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=8, radius=0.0016, location=direction(lat, lon) * 1.0015)
    dot = bpy.context.active_object
    dot.data.materials.append(material)
    dot.keyframe_insert("scale", frame=hide_from)
    dot.scale = (0.001, 0.001, 0.001)
    dot.keyframe_insert("scale", frame=hide_from + 6)


def ease(t):
    return t * t * (3 - 2 * t)


def ease_in(t):
    return t ** 3


def look(camera, location, forward, up):
    """Places the camera and points it along forward with up toward the top of the frame."""
    z_axis = -forward.normalized()
    y_axis = (up - z_axis * up.dot(z_axis)).normalized()
    x_axis = y_axis.cross(z_axis)
    camera.matrix_world = Matrix((
        (x_axis.x, y_axis.x, z_axis.x, location.x),
        (x_axis.y, y_axis.y, z_axis.y, location.y),
        (x_axis.z, y_axis.z, z_axis.z, location.z),
        (0, 0, 0, 1),
    ))


HALF_FOV_TO_HORIZON = math.radians(19.0)
DIVE_POINT = (-0.85, 36.65)


def camera_path(shot, frame, frames):
    """Intro: high over the Indian Ocean, sweep west and down to Kenya with the horizon high in frame, then tip over
    and dive straight down to the clouds. The outro plays the same path backwards."""
    t = (frame - 1) / max(frames - 1, 1)
    if shot == "outro":
        t = 1 - t
    push = ease(min(t / 0.7, 1.0))
    dive = ease_in(max((t - 0.6) / 0.4, 0.0))
    altitude = 1.25 * (1 - push) + 0.09 * push
    altitude = altitude * (1 - dive) + 0.0045 * dive
    lat = DIVE_POINT[0] - 9.0 * (1 - push) - 2.2 * push * (1 - dive)
    lon = DIVE_POINT[1] + 16.0 * (1 - push)
    ground = direction(lat, lon)
    north = (Vector((0, 0, 1)) - ground * ground.z).normalized()
    dip = math.acos(1 / (1 + altitude))
    pitch = min(dip + HALF_FOV_TO_HORIZON, math.radians(89.0))
    pitch = pitch * (1 - dive) + math.radians(89.5) * dive
    forward = north * math.cos(pitch) - ground * math.sin(pitch)
    up = north * math.sin(pitch) + ground * math.cos(pitch)
    return ground * (1 + altitude), forward, up


def setup_scene(out_dir, shot, frames):
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x, scene.render.resolution_y = 1920, 1080
    scene.render.fps = 30
    scene.frame_start, scene.frame_end = 1, frames
    scene.eevee.use_bloom = True
    scene.eevee.bloom_threshold = 0.6
    scene.eevee.bloom_intensity = 0.05
    scene.eevee.bloom_radius = 6.0
    scene.eevee.use_motion_blur = True
    scene.eevee.motion_blur_shutter = 0.35
    scene.eevee.taa_render_samples = 48
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.world.use_nodes = True
    background = scene.world.node_tree.nodes["Background"]
    background.inputs["Color"].default_value = (0.0, 0.0, 0.002, 1)
    scene.render.filepath = str(out_dir / f"{shot}_")
    scene.render.image_settings.file_format = "PNG"


def main():
    textures, out_dir, shot, frames, preview = arguments()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.world = bpy.data.worlds.new("Space")
    setup_scene(out_dir, shot, frames)
    sphere("Earth", 1.0, earth_material(textures))
    sphere("Clouds", 1.006, cloud_material(textures))
    sphere("Atmosphere", 1.03, atmosphere_material())
    sun = bpy.data.lights.new("Sun", "SUN")
    sun.energy = 4.0
    sun_obj = bpy.data.objects.new("Sun", sun)
    bpy.context.scene.collection.objects.link(sun_obj)
    sun_obj.rotation_euler = direction(SUN_LAT, SUN_LON).to_track_quat("Z", "Y").to_euler()
    spore(emission_material("Spore", SPORE, 18.0), int(frames * 0.72))
    cam_data = bpy.data.cameras.new("Orbit")
    cam_data.lens = 28
    cam_data.clip_start = 0.0005
    camera = bpy.data.objects.new("Orbit", cam_data)
    bpy.context.scene.collection.objects.link(camera)
    bpy.context.scene.camera = camera
    for frame in range(1, frames + 1):
        location, forward, up = camera_path(shot, frame, frames)
        look(camera, location, forward, up)
        camera.keyframe_insert("location", frame=frame)
        camera.keyframe_insert("rotation_euler", frame=frame)
    out_dir.mkdir(parents=True, exist_ok=True)
    if not preview:
        bpy.ops.render.render(animation=True)
        return
    scene = bpy.context.scene
    scene.render.resolution_percentage = 40
    for frame in preview:
        scene.frame_set(frame)
        scene.render.filepath = str(out_dir / f"preview_{shot}_{frame:04d}.png")
        bpy.ops.render.render(write_still=True)


main()
