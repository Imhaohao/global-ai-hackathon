"""Phones, Noor's sack and stone, the cooperative store, drying beds and the extension officer's motorbike."""

import math

import bpy
import numpy as np

import meshkit
from plants import OCTAHEDRON_FACES, OCTAHEDRON_VERTICES, place, rotation_matrix, tube

SCREEN_SLOT_NAMES = {"feature": "FeaturePhoneScreen", "hub": "HubPhoneScreen", "officer": "OfficerPhoneScreen"}


def box_mesh(name, size, target, material, uv_tiles=(1.0, 1.0), location=(0, 0, 0)):
    """A box whose side faces map v from 0 at the bottom to 1 at the top and u along the face width."""
    sx, sy, sz = (value / 2 for value in size)
    corners = [(-sx, -sy, -sz), (sx, -sy, -sz), (sx, sy, -sz), (-sx, sy, -sz), (-sx, -sy, sz), (sx, -sy, sz), (sx, sy, sz), (-sx, sy, sz)]
    faces = [(0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7), (4, 5, 6, 7), (3, 2, 1, 0)]
    widths = [size[0], size[1], size[0], size[1], size[0], size[0]]
    uvs = []
    for face, width in zip(faces, widths):
        u = width * uv_tiles[0]
        uvs.extend([(0, 0), (u, 0), (u, uv_tiles[1]), (0, uv_tiles[1])])
    obj = meshkit.mesh_object(name, corners, faces, target, uvs=uvs, materials=[material], smooth=False)
    obj.location = location
    return obj


def screen_plane(name, width, height, target, material, location, rotation=(0, 0, 0)):
    vertices = [(-width / 2, -height / 2, 0), (width / 2, -height / 2, 0), (width / 2, height / 2, 0), (-width / 2, height / 2, 0)]
    obj = meshkit.mesh_object(name, vertices, [(0, 1, 2, 3)], target, uvs=[(0, 0), (1, 0), (1, 1), (0, 1)], materials=[material], smooth=False)
    obj.location = location
    obj.rotation_euler = rotation
    return obj


def parent_all(children, parent):
    for child in children:
        child.parent = parent


def empty(name, target, location=(0, 0, 0), rotation=(0, 0, 0)):
    obj = bpy.data.objects.new(name, None)
    obj.location = location
    obj.rotation_euler = rotation
    target.objects.link(obj)
    return obj


# ---------------------------------------------------------------- phones

def feature_phone(target, materials):
    """Noor's candybar phone, lying face up. Origin at the centre of its back."""
    root = empty("FeaturePhone", target)
    parts = [meshkit.add_bevel_box("FeaturePhoneBody", (0.049, 0.112, 0.0145), target, 0.006, 4, location=(0, 0, 0.00725))]
    meshkit.assign(parts[0], materials["phone_body"])
    bezel = meshkit.add_bevel_box("FeaturePhoneBezel", (0.041, 0.043, 0.001), target, 0.002, 2, location=(0, 0.027, 0.0146))
    meshkit.assign(bezel, materials["glass"])
    parts.append(bezel)
    parts.append(screen_plane(SCREEN_SLOT_NAMES["feature"], 0.031, 0.03875, target, materials["feature_screen"], (0, 0.0275, 0.01525)))
    speaker = meshkit.add_bevel_box("FeaturePhoneSpeaker", (0.012, 0.0016, 0.0006), target, 0.0006, 2, location=(0, 0.0515, 0.0147))
    meshkit.assign(speaker, materials["glass"])
    parts.append(speaker)
    dpad = meshkit.add_cylinder("FeaturePhoneDpad", 0.0078, 0.0014, target, 24, location=(0, -0.0035, 0.0151))
    meshkit.assign(dpad, materials["key"])
    select = meshkit.add_cylinder("FeaturePhoneSelect", 0.0036, 0.0018, target, 16, location=(0, -0.0035, 0.0154))
    meshkit.assign(select, materials["phone_body"])
    parts += [dpad, select]
    parts += _feature_phone_keys(target, materials)
    parent_all(parts, root)
    return root


def _atlas_uvs(cell, inset=0.2):
    column, row = cell % 4, cell // 4
    u0, u1 = (column + inset) / 4, (column + 1 - inset) / 4
    v0, v1 = 1 - (row + 1 - inset) / 4, 1 - (row + inset) / 4
    return [(u0, v0), (u1, v0), (u1, v1), (u0, v1)]


def _feature_phone_keys(target, materials):
    keys = []
    rows_y = [-0.0205, -0.0300, -0.0395, -0.0490]
    columns_x = [-0.0135, 0.0, 0.0135]
    for row, y in enumerate(rows_y):
        for column, x in enumerate(columns_x):
            keys.append(_key(f"FeaturePhoneKey_{row}_{column}", (x, y), (0.0118, 0.0078), row * 3 + column, target, materials))
    for side, cell, x in ((-1, 12, -0.0155), (1, 13, 0.0155)):
        keys.append(_key(f"FeaturePhoneCallKey_{'end' if side > 0 else 'call'}", (x, -0.0035), (0.0085, 0.0062), cell, target, materials))
    return keys


def _key(name, position, size, cell, target, materials):
    key = meshkit.add_bevel_box(name, (size[0], size[1], 0.0016), target, 0.0016, 2, location=(position[0], position[1], 0.0152))
    meshkit.assign(key, materials["key"])
    w, h = size[0] * 0.78, size[1] * 0.78
    vertices = [(-w / 2, -h / 2, 0), (w / 2, -h / 2, 0), (w / 2, h / 2, 0), (-w / 2, h / 2, 0)]
    print_plane = meshkit.mesh_object(f"{name}_print", vertices, [(0, 1, 2, 3)], target, uvs=_atlas_uvs(cell), materials=[materials["key_print"]], smooth=False)
    print_plane.location = (position[0], position[1], 0.01605)
    return meshkit.join([key, print_plane], name)


def smartphone(prefix, screen_key, target, materials):
    """A plain Android phone lying face up, origin at the centre of its back."""
    root = empty(prefix, target)
    body = meshkit.add_bevel_box(f"{prefix}Body", (0.075, 0.161, 0.0085), target, 0.007, 4, location=(0, 0, 0.00425))
    meshkit.assign(body, materials["smartphone_body"])
    glass = meshkit.add_bevel_box(f"{prefix}Glass", (0.0735, 0.1595, 0.0006), target, 0.0062, 3, location=(0, 0, 0.0085))
    meshkit.assign(glass, materials["glass"])
    screen = screen_plane(SCREEN_SLOT_NAMES[screen_key], 0.0685, 0.1505, target, materials[f"{screen_key}_screen"], (0, 0, 0.00885))
    lens = meshkit.add_cylinder(f"{prefix}Lens", 0.006, 0.002, target, 16, location=(-0.022, 0.064, -0.0005))
    meshkit.assign(lens, materials["glass"])
    parent_all([body, glass, screen, lens], root)
    return root


# ---------------------------------------------------------------- Noor's corner of the terrace

def sack_of_cherries(target, materials, seed=3):
    rng = np.random.default_rng(seed)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=28, ring_count=16, radius=1.0)
    sack = bpy.context.active_object
    sack.name = "JuteSack"
    meshkit._move_to(sack, target)
    vertices = np.array([v.co[:] for v in sack.data.vertices])
    z = vertices[:, 2]
    shaped = vertices * np.array([0.24, 0.2, 0.3])
    shaped[:, 2] = np.where(z < -0.6, -0.6 * 0.3 + (z + 0.6) * 0.05, shaped[:, 2])
    shaped[:, 2] = np.where(z > 0.75, 0.75 * 0.3 + (z - 0.75) * 0.02, shaped[:, 2])
    rim = np.clip((z - 0.55) / 0.2, 0, 1)
    shaped[:, :2] *= (1.0 + 0.12 * rim)[:, None]
    lumps = 1.0 + 0.04 * np.sin(vertices[:, 0] * 9 + seed) * np.cos(vertices[:, 1] * 7) + rng.normal(0, 0.006, len(vertices))
    shaped[:, :2] *= lumps[:, None]
    shaped[:, 2] += 0.18
    for vertex, position in zip(sack.data.vertices, shaped):
        vertex.co = position
    meshkit.assign(sack, materials["burlap"])
    meshkit.shade_smooth(sack)
    top_z = float(shaped[:, 2].max())
    cherries = []
    for _ in range(140):
        radius = math.sqrt(rng.random()) * 0.2
        angle = rng.uniform(0, 2 * math.pi)
        centre = np.array([math.cos(angle) * radius, math.sin(angle) * radius * 0.85, top_z - 0.03 + 0.05 * (1 - radius / 0.2) + rng.uniform(-0.01, 0.01)])
        cherries.append(OCTAHEDRON_VERTICES * rng.uniform(0.0075, 0.0095) + centre)
    faces = [tuple(index + block * 6 for index in face) for block in range(len(cherries)) for face in OCTAHEDRON_FACES]
    colours = []
    for _ in cherries:
        colour = (0.6, 0.07, 0.06) if rng.random() < 0.8 else (0.82, 0.38, 0.07)
        colours.extend([colour] * 6)
    pile = meshkit.mesh_object("SackCherries", np.vstack(cherries), faces, target, colors=meshkit.loop_values(faces, colours), materials=[materials["cherry"]])
    pile.parent = sack
    return sack


def flat_stone(target, materials, seed=8):
    rng = np.random.default_rng(seed)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3, radius=1.0)
    stone = bpy.context.active_object
    stone.name = "FlatStone"
    meshkit._move_to(stone, target)
    for vertex in stone.data.vertices:
        x, y, z = vertex.co
        bump = 1.0 + 0.08 * math.sin(x * 5 + seed) * math.cos(y * 4) + rng.normal(0, 0.02)
        vertex.co = (x * 0.2 * bump, y * 0.14 * bump, max(z, -0.4) * 0.07 * bump)
    meshkit.assign(stone, materials["stone"])
    meshkit.shade_smooth(stone)
    return stone


# ---------------------------------------------------------------- cooperative

def corrugated_roof(name, width, depth, target, material, pitch=0.076, amplitude=0.012):
    columns = int(width / pitch * 8)
    xs = np.linspace(-width / 2, width / 2, columns)
    vertices, uvs = [], []
    for y in (-depth / 2, depth / 2):
        for x in xs:
            vertices.append((x, y, amplitude * math.sin(2 * math.pi * x / pitch)))
            uvs.append(((x + width / 2) / 1.2, (y + depth / 2) / 1.2))
    faces = meshkit.grid_faces(2, columns)
    return meshkit.mesh_object(name, vertices, faces, target, uvs=meshkit.loop_values(faces, uvs), materials=[material])


def cooperative(target, materials, centre, size, ground_z):
    width, depth = size
    wall_height = 3.0
    parts = []
    walls = box_mesh("CooperativeWalls", (width, depth, wall_height), target, materials["plaster"], uv_tiles=(1 / 3.0, 1.0))
    walls.location = (centre[0], centre[1], ground_z + wall_height / 2 - 0.05)
    parts.append(walls)
    front_y = centre[1] - depth / 2 - 0.01
    door = box_mesh("CooperativeDoor", (1.0, 0.05, 2.1), target, materials["planks"], uv_tiles=(1.0, 1.0))
    door.location = (centre[0] - 1.6, front_y, ground_z + 1.05)
    parts.append(door)
    for index, x in enumerate((centre[0] + 0.6, centre[0] + 2.9)):
        window = box_mesh(f"CooperativeWindow_{index}", (1.2, 0.05, 1.0), target, materials["window"])
        window.location = (x, front_y, ground_z + 1.65)
        parts.append(window)
    sign = box_mesh("CooperativeSign", (3.2, 0.06, 0.55), target, materials["sign"])
    sign.location = (centre[0] - 0.4, front_y - 0.02, ground_z + 2.62)
    parts.append(sign)
    roof_depth = depth + 3.0
    roof = corrugated_roof("CooperativeRoof", width + 0.8, roof_depth, target, materials["iron"])
    roof.location = (centre[0], centre[1] - 1.2, ground_z + 3.25)
    roof.rotation_euler = (math.atan2(0.75, roof_depth), 0, 0)
    parts.append(roof)
    for index, x in enumerate(np.linspace(centre[0] - width / 2 + 0.3, centre[0] + width / 2 - 0.3, 4)):
        post = meshkit.add_cylinder(f"VerandaPost_{index}", 0.06, 2.75, target, 8, location=(x, centre[1] - depth / 2 - 2.4, ground_z + 1.37))
        meshkit.assign(post, materials["wood"])
        parts.append(post)
    slab = box_mesh("VerandaSlab", (width + 0.6, 2.9, 0.16), target, materials["concrete"])
    slab.location = (centre[0], centre[1] - depth / 2 - 1.35, ground_z + 0.03)
    parts.append(slab)
    panel = meshkit.add_bevel_box("SolarPanel", (1.7, 1.0, 0.04), target, 0.01, 1, location=(centre[0] + 2.4, centre[1] + 0.8, ground_z + 3.62))
    panel.rotation_euler = (math.atan2(0.75, roof_depth) + 0.12, 0, 0)
    meshkit.assign(panel, materials["solar"])
    parts.append(panel)
    tank = meshkit.add_cylinder("WaterTank", 0.8, 1.7, target, 24, location=(centre[0] + width / 2 + 1.1, centre[1] + 1.0, ground_z + 0.85))
    meshkit.assign(tank, materials["tank"])
    parts.append(tank)
    return parts


def hub_table(target, materials, location, phone_materials):
    """The table on the veranda where the cooperative's hub phone sits on its stand, plugged in."""
    root = empty("HubTable", target, location=location)
    top = box_mesh("HubTableTop", (1.4, 0.72, 0.04), target, materials["planks"], uv_tiles=(0.8, 0.5))
    top.location = (0, 0, 0.76)
    parts = [top]
    for index, (x, y) in enumerate(((-0.64, -0.3), (0.64, -0.3), (-0.64, 0.3), (0.64, 0.3))):
        leg = box_mesh(f"HubTableLeg_{index}", (0.05, 0.05, 0.74), target, materials["wood"])
        leg.location = (x, y, 0.37)
        parts.append(leg)
    stand = box_mesh("HubPhoneStand", (0.09, 0.08, 0.012), target, materials["stand"])
    stand.location = (0.15, -0.06, 0.786)
    parts.append(stand)
    back = box_mesh("HubPhoneStandBack", (0.07, 0.008, 0.1), target, materials["stand"])
    back.location = (0.15, -0.03, 0.83)
    back.rotation_euler = (math.radians(-22), 0, 0)
    parts.append(back)
    phone = smartphone("HubPhone", "hub", target, phone_materials)
    phone.location = (0.15, -0.075, 0.795)
    phone.rotation_euler = (math.radians(68), 0, 0)
    phone.scale = (1, 1, 1)
    battery = meshkit.add_bevel_box("PowerBank", (0.16, 0.08, 0.03), target, 0.008, 2, location=(0.48, 0.05, 0.795))
    meshkit.assign(battery, materials["stand"])
    parts.append(battery)
    cable_points = [(0.15, -0.02, 0.79), (0.22, 0.05, 0.783), (0.32, 0.09, 0.783), (0.4, 0.06, 0.785)]
    vertices, faces, uvs = tube(cable_points, [0.0025] * 4, 6)
    cable = meshkit.mesh_object("HubCable", vertices, faces, target, uvs=meshkit.loop_values(faces, uvs), materials=[materials["cable"]])
    parts.append(cable)
    ledger = box_mesh("Ledger", (0.24, 0.32, 0.025), target, materials["ledger"])
    ledger.location = (-0.35, 0.02, 0.793)
    ledger.rotation_euler = (0, 0, 0.18)
    parts.append(ledger)
    mug = meshkit.add_cylinder("Mug", 0.04, 0.09, target, 16, location=(-0.05, 0.18, 0.825))
    meshkit.assign(mug, materials["enamel"])
    parts.append(mug)
    bench = box_mesh("Bench", (1.3, 0.3, 0.05), target, materials["planks"], uv_tiles=(0.8, 0.5))
    bench.location = (0, 0.75, 0.45)
    parts.append(bench)
    parent_all(parts + [phone], root)
    return root, phone


def drying_bed(index, bed, ground, target, materials):
    root = empty(f"DryingBed_{index}", target, location=(bed["x"], bed["y"], ground))
    length, width = bed["length"], bed["width"]
    surface = box_mesh(f"DryingBedSurface_{index}", (length, width, 0.03), target, materials["parchment"], uv_tiles=(1 / 1.2, 1.0))
    surface.location = (0, 0, 0.92)
    parts = [surface]
    for leg_index, x in enumerate(np.linspace(-length / 2 + 0.1, length / 2 - 0.1, 5)):
        for side in (-1, 1):
            leg = box_mesh(f"DryingBedLeg_{index}_{leg_index}_{side}", (0.05, 0.05, 0.92), target, materials["wood"])
            leg.location = (x, side * (width / 2 - 0.04), 0.46)
            parts.append(leg)
    parent_all(parts, root)
    return root


# ---------------------------------------------------------------- motorbike

def motorbike(target, materials, location, heading, phone_materials):
    root = empty("OfficerMotorbike", target, location=location, rotation=(math.radians(-5), 0, heading))
    parts = []
    for name, x in (("Rear", -0.66), ("Front", 0.66)):
        bpy.ops.mesh.primitive_torus_add(major_radius=0.29, minor_radius=0.055, major_segments=36, minor_segments=10, location=(x, 0, 0.345), rotation=(math.pi / 2, 0, 0))
        tyre = bpy.context.active_object
        tyre.name = f"MotorbikeTyre{name}"
        meshkit._move_to(tyre, target)
        meshkit.assign(tyre, materials["rubber"])
        rim = meshkit.add_cylinder(f"MotorbikeRim{name}", 0.235, 0.03, target, 28, location=(x, 0, 0.345), rotation=(math.pi / 2, 0, 0))
        meshkit.assign(rim, materials["chrome"])
        parts += [tyre, rim]
    frame_paths = [
        [(-0.66, 0, 0.345), (-0.2, 0, 0.62), (0.4, 0, 0.92)],
        [(-0.66, 0, 0.345), (-0.05, 0, 0.42), (0.35, 0, 0.5), (0.48, 0, 0.98)],
        [(0.66, 0.06, 0.345), (0.5, 0.06, 0.8), (0.46, 0.06, 1.02)],
        [(0.66, -0.06, 0.345), (0.5, -0.06, 0.8), (0.46, -0.06, 1.02)],
        [(0.47, -0.36, 1.06), (0.47, 0.36, 1.06)],
    ]
    for index, path in enumerate(frame_paths):
        vertices, faces, uvs = tube(path, [0.022] * len(path), 8)
        tube_object = meshkit.mesh_object(f"MotorbikeFrame_{index}", vertices, faces, target, uvs=meshkit.loop_values(faces, uvs), materials=[materials["chrome" if index >= 2 else "paint"]])
        parts.append(tube_object)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=1.0, location=(0.18, 0, 0.86))
    tank = bpy.context.active_object
    tank.name = "MotorbikeTank"
    tank.scale = (0.26, 0.15, 0.11)
    meshkit._move_to(tank, target)
    meshkit.assign(tank, materials["paint"])
    meshkit.shade_smooth(tank)
    seat = meshkit.add_bevel_box("MotorbikeSeat", (0.62, 0.25, 0.08), target, 0.035, 3, location=(-0.3, 0, 0.84))
    meshkit.assign(seat, materials["seat"])
    engine = meshkit.add_bevel_box("MotorbikeEngine", (0.36, 0.22, 0.26), target, 0.04, 2, location=(0.05, 0, 0.46))
    meshkit.assign(engine, materials["engine"])
    lamp = meshkit.add_cylinder("MotorbikeLamp", 0.075, 0.09, target, 20, location=(0.6, 0, 0.98), rotation=(0, math.pi / 2, 0))
    meshkit.assign(lamp, materials["chrome"])
    rack = meshkit.add_bevel_box("MotorbikeBox", (0.38, 0.34, 0.26), target, 0.02, 2, location=(-0.72, 0, 0.98))
    meshkit.assign(rack, materials["box"])
    parts += [tank, seat, engine, lamp, rack]
    mount = meshkit.add_bevel_box("PhoneMount", (0.05, 0.03, 0.08), target, 0.01, 2, location=(0.47, 0, 1.1))
    meshkit.assign(mount, materials["stand"])
    parts.append(mount)
    phone = smartphone("OfficerPhone", "officer", target, phone_materials)
    phone.location = (0.45, 0, 1.17)
    phone.rotation_euler = (math.radians(70), 0, math.radians(-90))
    parent_all(parts + [phone], root)
    return root, phone
