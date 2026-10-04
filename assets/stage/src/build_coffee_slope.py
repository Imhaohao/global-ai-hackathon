"""Builds the Leaf Doctor stage in Blender and exports it.

    /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup \
        --python assets/stage/src/build_coffee_slope.py -- --polyhaven <dir> --hdri <file.hdr>

Writes assets/stage/coffee-slope.blend, assets/stage/coffee-slope.raw.glb and assets/stage/anchors.json.
Run assets/stage/src/optimize.sh afterwards to produce the compressed coffee-slope.glb.
Units are metres. Blender is z-up; the glTF export is y-up, so a Blender point (x, y, z) is (x, z, -y) in three.js.
"""

import json
import math
import sys
from pathlib import Path

import bpy
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))

import layout  # noqa: E402
import meshkit  # noqa: E402
import plants  # noqa: E402
import props  # noqa: E402
import terrain  # noqa: E402

STAGE = Path(__file__).resolve().parent.parent
TEX = meshkit.TEXTURES
SCREENS = STAGE / "screens"
TERRAIN_SPACING = 0.34


def parse_args():
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    options = {"polyhaven": None, "hdri": None}
    for key, value in zip(argv[::2], argv[1::2]):
        options[key.lstrip("-")] = value
    return options


def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    return scene


def build_materials():
    m = meshkit.pbr_material
    ph = meshkit.polyhaven_texture
    return {
        "terrain": m("Terrain", base_texture=TEX / "terrain_color.jpg", roughness=0.95),
        "hills": m("DistantHills", use_vertex_color=True, roughness=1.0),
        "leaf": m("CoffeeLeaf", base_texture=TEX / "leaf_color.jpg", normal_texture=TEX / "leaf_normal.jpg", orm_texture=TEX / "leaf_orm.jpg", use_vertex_color=True, double_sided=True, normal_strength=0.6),
        "wood": m("CoffeeWood", color=meshkit.linear("#3a2e24"), roughness=0.85),
        "spray": m("CoffeeSpray", base_texture=TEX / "coffee_spray.png", use_vertex_color=True, alpha_clip=True, double_sided=True, roughness=0.42),
        "cherry": m("CoffeeCherry", use_vertex_color=True, roughness=0.35),
        "rust_hero": m("RustLeafHero", base_texture=TEX / "rust_leaf_color.jpg", normal_texture=TEX / "rust_leaf_normal.jpg", orm_texture=TEX / "rust_leaf_orm.jpg", emissive_texture=TEX / "rust_leaf_emissive.jpg", emission_strength=1.0, double_sided=True),
        "rust_other": m("RustLeaf", base_texture=TEX / "rust_leaf_b_color.jpg", normal_texture=TEX / "rust_leaf_b_normal.jpg", orm_texture=TEX / "rust_leaf_b_orm.jpg", emissive_texture=TEX / "rust_leaf_b_emissive.jpg", emission_strength=1.0, double_sided=True),
        "bark": m("GrevilleaBark", base_texture=ph("eucalyptus_bark"), roughness=0.9),
        "grevillea": m("GrevilleaFoliage", base_texture=TEX / "grevillea_card.png", use_vertex_color=True, alpha_clip=True, double_sided=True, roughness=0.8),
        "banana_stem": m("BananaStem", color=meshkit.linear("#5d6b33"), roughness=0.7),
        "banana_leaf": m("BananaLeaf", base_texture=TEX / "banana_leaf_color.jpg", double_sided=True, roughness=0.55),
    }


def build_prop_materials():
    m = meshkit.pbr_material
    ph = meshkit.polyhaven_texture
    return {
        "phone_body": m("PhonePlastic", color=meshkit.linear("#22262d"), roughness=0.42),
        "glass": m("PhoneGlass", color=meshkit.linear("#0c0e10"), roughness=0.08),
        "key": m("PhoneKey", color=meshkit.linear("#282a2c"), roughness=0.5),
        "key_print": m("PhoneKeyPrint", base_texture=TEX / "keypad_atlas.png", roughness=0.5),
        "feature_screen": m("FeaturePhoneScreen", base_texture=SCREENS / "feature-reply.png", emissive_texture=SCREENS / "feature-reply.png", emission_strength=0.6, roughness=0.3),
        "hub_screen": m("HubPhoneScreen", base_texture=SCREENS / "hub-exchange.png", emissive_texture=SCREENS / "hub-exchange.png", emission_strength=0.6, roughness=0.2),
        "officer_screen": m("OfficerPhoneScreen", base_texture=SCREENS / "officer-case.png", emissive_texture=SCREENS / "officer-case.png", emission_strength=0.6, roughness=0.2),
        "smartphone_body": m("SmartphoneBody", color=meshkit.linear("#3a3f46"), roughness=0.3, metallic=0.6),
        "burlap": m("Burlap", base_texture=TEX / "burlap_color.jpg", normal_texture=TEX / "burlap_normal.jpg", roughness=0.95),
        "cherry": m("SackCherry", use_vertex_color=True, roughness=0.35),
        "stone": m("Stone", base_texture=TEX / "stone_color.jpg", roughness=0.9),
        "plaster": m("Plaster", base_texture=TEX / "plaster_color.jpg", roughness=0.92),
        "planks": m("Planks", base_texture=ph("brown_planks_05"), roughness=0.8),
        "wood": m("PostWood", color=meshkit.linear("#5a4330"), roughness=0.85),
        "window": m("Window", color=meshkit.linear("#1d2326"), roughness=0.25),
        "sign": m("SignBoard", color=meshkit.linear("#e3d9bd"), roughness=0.7),
        "iron": m("CorrugatedIron", base_texture=ph("corrugated_iron"), metallic=0.7, roughness=0.45, double_sided=True),
        "concrete": m("Concrete", color=meshkit.linear("#a39d92"), roughness=0.95),
        "solar": m("SolarCells", color=meshkit.linear("#1a2440"), roughness=0.15, metallic=0.4),
        "tank": m("WaterTankPlastic", color=meshkit.linear("#24382c"), roughness=0.55),
        "stand": m("MatteBlack", color=meshkit.linear("#1a1a1a"), roughness=0.6),
        "cable": m("Cable", color=meshkit.linear("#e8e8e4"), roughness=0.5),
        "ledger": m("Ledger", color=meshkit.linear("#6e2a20"), roughness=0.7),
        "enamel": m("EnamelMug", color=meshkit.linear("#e6e4da"), roughness=0.3),
        "parchment": m("Parchment", base_texture=TEX / "parchment_color.jpg", roughness=0.9),
        "rubber": m("Rubber", color=meshkit.linear("#151515"), roughness=0.8),
        "chrome": m("Chrome", color=meshkit.linear("#c8c8c8"), metallic=1.0, roughness=0.22),
        "paint": m("BikePaint", color=meshkit.linear("#7a1f1a"), metallic=0.3, roughness=0.3),
        "seat": m("BikeSeat", color=meshkit.linear("#202020"), roughness=0.55),
        "engine": m("Engine", color=meshkit.linear("#5a5a5a"), metallic=0.8, roughness=0.4),
        "box": m("CarryBox", color=meshkit.linear("#7d6a4a"), roughness=0.75),
    }


def build_terrain(target, material):
    xs = np.arange(terrain.EXTENT_X[0], terrain.EXTENT_X[1] + 1e-6, TERRAIN_SPACING)
    ys = np.arange(terrain.EXTENT_Y[0], terrain.EXTENT_Y[1] + 1e-6, TERRAIN_SPACING)
    grid_x, grid_y = np.meshgrid(xs, ys)
    heights = terrain.height(grid_x, grid_y)
    vertices = np.column_stack([grid_x.ravel(), grid_y.ravel(), heights.ravel()])
    span_x = terrain.EXTENT_X[1] - terrain.EXTENT_X[0]
    span_y = terrain.EXTENT_Y[1] - terrain.EXTENT_Y[0]
    uv = np.column_stack([(grid_x.ravel() - terrain.EXTENT_X[0]) / span_x, (grid_y.ravel() - terrain.EXTENT_Y[0]) / span_y])
    faces = meshkit.grid_faces(len(ys), len(xs))
    return meshkit.mesh_object("Terrain", vertices, faces, target, uvs=meshkit.loop_values(faces, uv), materials=[material])


def build_distant_hills(target, material):
    layers = [(80.0, 26.0, (0.24, 0.33, 0.24)), (125.0, 42.0, (0.35, 0.42, 0.37)), (190.0, 64.0, (0.5, 0.55, 0.52))]
    objects = []
    for index, (distance, peak, colour) in enumerate(layers):
        xs = np.linspace(-320, 320, 140)
        rows = []
        for depth in np.linspace(0, 1, 6):
            y = distance + depth * 70.0
            ridge = peak * (0.55 + 0.25 * np.sin(xs / 37.0 + index * 1.7) + 0.15 * np.sin(xs / 13.0 + index) + 0.05 * np.sin(xs / 5.0))
            profile = math.sin(math.pi * min(1.0, depth * 1.6)) if depth < 0.62 else 1.0 - (depth - 0.62) * 1.4
            rows.append(np.column_stack([xs, np.full_like(xs, y), ridge * profile - 2.0]))
        vertices = np.vstack(rows)
        faces = meshkit.grid_faces(6, len(xs))
        colours = np.tile(colour, (len(vertices), 1))
        objects.append(meshkit.mesh_object(f"DistantHills_{index}", vertices, faces, target, colors=meshkit.loop_values(faces, colours), materials=[material]))
    return objects


def build_bushes(target, materials):
    bush_materials = [materials["spray"], materials["wood"]]
    prototypes = collection_prototypes(target, bush_materials)
    placed = []
    for index, bush in enumerate(layout.bush_positions()):
        key = ("near" if bush["near"] else "far", bush["variant"])
        instance = bpy.data.objects.new(f"CoffeeBush_{index:03d}", prototypes[key].data)
        instance.location = (bush["x"], bush["y"], bush["z"] - 0.04)
        instance.rotation_euler = (0, 0, bush["rotation"])
        instance.scale = (bush["scale"],) * 3
        target.objects.link(instance)
        placed.append(instance)
    for prototype in prototypes.values():
        bpy.data.objects.remove(prototype)
    return placed


def collection_prototypes(target, bush_materials):
    prototypes = {}
    for variant in range(3):
        for distance, detailed in (("near", True), ("far", False)):
            obj, _ = plants.coffee_bush(f"CoffeeBushMesh_{distance}_{variant}", 100 + variant, detailed, target, bush_materials)
            prototypes[(distance, variant)] = obj
    return prototypes


def place_props(target, prop_materials, plant_materials):
    anchors = {}
    hero_x, hero_y, hero_z = layout.hero_bush()
    camera_direction = (0.45, -1.0, 0.0)
    bush, rust_leaves = plants.hero_bush("HeroBush", target, [plant_materials["leaf"], plant_materials["wood"], plant_materials["cherry"]], [plant_materials["rust_hero"], plant_materials["rust_other"]], camera_direction, (hero_x, hero_y, hero_z - 0.04))
    anchors["heroBush"] = (hero_x, hero_y, hero_z)

    sack_x, sack_y, sack_z = layout.sack_spot()
    sack = props.sack_of_cherries(target, prop_materials)
    sack.location = (sack_x, sack_y, sack_z - 0.02)
    stone = props.flat_stone(target, prop_materials)
    stone_x, stone_y = sack_x - 0.5, sack_y - 0.25
    stone_z = float(terrain.height(stone_x, stone_y))
    stone.location = (stone_x, stone_y, stone_z)
    phone = props.feature_phone(target, prop_materials)
    phone.location = (stone_x + 0.02, stone_y, stone_z + 0.074)
    phone.rotation_euler = (0.04, -0.05, math.radians(-28))
    anchors["sack"] = (sack_x, sack_y, sack_z)

    centre = layout.COOPERATIVE_CENTRE
    ground = float(terrain.height(*centre))
    props.cooperative(target, prop_materials, centre, layout.COOPERATIVE_SIZE, ground)
    table_location = (centre[0] + 1.6, centre[1] - layout.COOPERATIVE_SIZE[1] / 2 - 1.3, ground + 0.11)
    props.hub_table(target, prop_materials, table_location, prop_materials)
    anchors["cooperative"] = (centre[0], centre[1], ground)

    for index, bed in enumerate(layout.drying_beds()):
        props.drying_bed(index, bed, float(terrain.height(bed["x"], bed["y"])), target, prop_materials)

    bike_x, bike_y = layout.MOTORBIKE_SPOT
    props.motorbike(target, prop_materials, (bike_x, bike_y, float(terrain.height(bike_x, bike_y)) - 0.02), math.radians(170), prop_materials)
    anchors["motorbike"] = (bike_x, bike_y, float(terrain.height(bike_x, bike_y)))
    return anchors, rust_leaves


def place_trees(target, materials):
    for tree in layout.shade_trees():
        obj = plants.grevillea(f"Grevillea_{tree['seed']}", tree["height"], tree["seed"], target, materials["bark"], materials["grevillea"])
        obj.location = (tree["x"], tree["y"], tree["z"] - 0.1)
    for plant in layout.banana_plants():
        obj = plants.banana(f"Banana_{plant['seed']}", plant["seed"], target, materials["banana_stem"], materials["banana_leaf"])
        obj.location = (plant["x"], plant["y"], plant["z"] - 0.05)


def to_three(point):
    x, y, z = point
    return [round(float(x), 4), round(float(z), 4), round(float(-y), 4)]


def world_centre(obj):
    bpy.context.view_layer.update()
    corners = [obj.matrix_world @ v.co for v in obj.data.vertices]
    return tuple(sum(c[i] for c in corners) / len(corners) for i in range(3))


def world_normal(obj):
    bpy.context.view_layer.update()
    normal = obj.matrix_world.to_3x3() @ obj.data.polygons[len(obj.data.polygons) // 2].normal
    normal.normalize()
    return tuple(normal)


def write_anchors(anchors, rust_leaves):
    screens = {name: bpy.data.objects[name] for name in props.SCREEN_SLOT_NAMES.values()}
    data = {
        "units": "metres, three.js y-up (Blender (x, y, z) becomes (x, z, -y))",
        "points": {name: to_three(point) for name, point in anchors.items()},
        "screens": {name: {"centre": to_three(world_centre(obj)), "normal": to_three(world_normal(obj))} for name, obj in screens.items()},
        "rustLeaves": [{"name": leaf.name, "centre": to_three(world_centre(leaf)), "normal": to_three(world_normal(leaf))} for leaf in rust_leaves],
        "bushes": [to_three((bush["x"], bush["y"], bush["z"] + 1.0)) for bush in layout.bush_positions()],
        "path": [to_three((float(terrain.path_x(y)), y, float(terrain.height(terrain.path_x(y), y)))) for y in np.arange(-12.0, 40.0, 2.0)],
    }
    (STAGE / "anchors.json").write_text(json.dumps(data, indent=1))


def setup_world(scene, hdri):
    world = bpy.data.worlds.new("Morning")
    scene.world = world
    world.use_nodes = True
    nodes, links = world.node_tree.nodes, world.node_tree.links
    background = next(node for node in nodes if node.type == "BACKGROUND")
    if hdri:
        environment = nodes.new("ShaderNodeTexEnvironment")
        environment.image = bpy.data.images.load(hdri)
        links.new(environment.outputs["Color"], background.inputs["Color"])
        background.inputs["Strength"].default_value = 0.9
    sun_data = bpy.data.lights.new("Sun", "SUN")
    sun_data.energy = 2.4
    sun_data.color = (1.0, 0.86, 0.68)
    sun_data.angle = math.radians(2.5)
    sun = bpy.data.objects.new("Sun", sun_data)
    sun.rotation_euler = (math.radians(62), 0, math.radians(-128))
    scene.collection.objects.link(sun)


def export(scene):
    blend_path = STAGE / "coffee-slope.blend"
    bpy.ops.file.pack_all()
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path), compress=True)
    bpy.ops.object.select_all(action="DESELECT")
    for obj in scene.objects:
        obj.select_set(obj.type in {"MESH", "EMPTY"})
    bpy.ops.export_scene.gltf(
        filepath=str(STAGE / "coffee-slope.raw.glb"),
        export_format="GLB",
        use_selection=True,
        export_yup=True,
        export_apply=True,
        export_extras=True,
        export_cameras=False,
        export_lights=False,
        export_image_format="AUTO",
    )


def main():
    options = parse_args()
    meshkit.set_polyhaven_dir(options["polyhaven"])
    scene = reset_scene()
    world_collection = meshkit.collection("Stage")
    plant_materials = build_materials()
    prop_materials = build_prop_materials()
    build_terrain(world_collection, plant_materials["terrain"])
    build_distant_hills(world_collection, plant_materials["hills"])
    build_bushes(meshkit.collection("Bushes", world_collection), plant_materials)
    place_trees(meshkit.collection("Trees", world_collection), plant_materials)
    anchors, rust_leaves = place_props(meshkit.collection("Props", world_collection), prop_materials, plant_materials)
    setup_world(scene, options["hdri"])
    write_anchors(anchors, rust_leaves)
    export(scene)


main()
