"""Small helpers for building meshes and glTF-friendly materials from numpy data inside Blender."""

from pathlib import Path

import bpy
import numpy as np

TEXTURES = Path(__file__).resolve().parent.parent / "textures"
POLYHAVEN = None


def set_polyhaven_dir(path):
    global POLYHAVEN
    POLYHAVEN = Path(path)


def linear(hex_colour):
    """An sRGB hex colour as the linear RGB tuple Blender's colour sockets expect."""
    value = hex_colour.lstrip("#")
    channels = [int(value[i : i + 2], 16) / 255.0 for i in (0, 2, 4)]
    return tuple(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in channels)


def collection(name, parent=None):
    existing = bpy.data.collections.get(name)
    if existing:
        return existing
    created = bpy.data.collections.new(name)
    (parent or bpy.context.scene.collection).children.link(created)
    return created


def mesh_object(name, vertices, faces, target, uvs=None, colors=None, materials=None, material_indices=None, smooth=True):
    """Builds an object from arrays. `uvs` and `colors` are per loop (one row per face corner, in face order)."""
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata([tuple(v) for v in np.asarray(vertices, dtype=float)], [], [tuple(f) for f in faces])
    if uvs is not None:
        layer = mesh.uv_layers.new(name="UVMap")
        layer.data.foreach_set("uv", np.asarray(uvs, dtype=np.float32).ravel())
    if colors is not None:
        attribute = mesh.color_attributes.new("Color", "BYTE_COLOR", "CORNER")
        rgba = np.asarray(colors, dtype=np.float32)
        if rgba.shape[1] == 3:
            rgba = np.hstack([rgba, np.ones((len(rgba), 1), dtype=np.float32)])
        attribute.data.foreach_set("color", rgba.ravel())
    for material in materials or []:
        mesh.materials.append(material)
    if material_indices is not None:
        mesh.polygons.foreach_set("material_index", np.asarray(material_indices, dtype=np.int32))
    mesh.polygons.foreach_set("use_smooth", [smooth] * len(mesh.polygons))
    mesh.validate()
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    target.objects.link(obj)
    return obj


def loop_values(faces, per_vertex):
    """Expands per-vertex values (uv or colour) to per-loop rows in face order."""
    per_vertex = np.asarray(per_vertex)
    return np.concatenate([per_vertex[list(face)] for face in faces])


def grid_faces(rows, columns, offset=0):
    faces = []
    for r in range(rows - 1):
        for c in range(columns - 1):
            a = offset + r * columns + c
            faces.append((a, a + 1, a + columns + 1, a + columns))
    return faces


def _image(path, non_color=False):
    image = bpy.data.images.load(str(path), check_existing=True)
    if non_color:
        image.colorspace_settings.name = "Non-Color"
    return image


def _texture_node(nodes, path, non_color=False, location=(-600, 0)):
    node = nodes.new("ShaderNodeTexImage")
    node.image = _image(path, non_color)
    node.location = location
    return node


def pbr_material(name, color=(0.5, 0.5, 0.5), roughness=0.6, metallic=0.0, base_texture=None, normal_texture=None,
                 orm_texture=None, emissive_texture=None, emission_strength=1.0, use_vertex_color=False,
                 alpha_clip=False, double_sided=False, normal_strength=1.0):
    existing = bpy.data.materials.get(name)
    if existing:
        return existing
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    material.use_backface_culling = not double_sided
    nodes, links = material.node_tree.nodes, material.node_tree.links
    shader = next(node for node in nodes if node.type == "BSDF_PRINCIPLED")
    shader.inputs["Base Color"].default_value = (*color, 1.0)
    shader.inputs["Roughness"].default_value = roughness
    shader.inputs["Metallic"].default_value = metallic
    base_socket = None
    if base_texture:
        base = _texture_node(nodes, base_texture, location=(-700, 300))
        base_socket = base.outputs["Color"]
        if alpha_clip:
            links.new(base.outputs["Alpha"], shader.inputs["Alpha"])
            material.blend_method = "CLIP"
            material.alpha_threshold = 0.5
    if use_vertex_color and base_socket is None:
        attribute = nodes.new("ShaderNodeVertexColor")
        attribute.layer_name = "Color"
        attribute.location = (-700, 0)
        base_socket = attribute.outputs["Color"]
    if base_socket is not None:
        links.new(base_socket, shader.inputs["Base Color"])
    if normal_texture:
        normal_image = _texture_node(nodes, normal_texture, non_color=True, location=(-700, -400))
        normal_map = nodes.new("ShaderNodeNormalMap")
        normal_map.inputs["Strength"].default_value = normal_strength
        links.new(normal_image.outputs["Color"], normal_map.inputs["Color"])
        links.new(normal_map.outputs["Normal"], shader.inputs["Normal"])
    if orm_texture:
        orm = _texture_node(nodes, orm_texture, non_color=True, location=(-900, -150))
        separate = nodes.new("ShaderNodeSeparateColor")
        links.new(orm.outputs["Color"], separate.inputs["Color"])
        links.new(separate.outputs["Green"], shader.inputs["Roughness"])
        links.new(separate.outputs["Blue"], shader.inputs["Metallic"])
    if emissive_texture:
        emission = _texture_node(nodes, emissive_texture, location=(-700, -700))
        links.new(emission.outputs["Color"], shader.inputs["Emission Color"])
        shader.inputs["Emission Strength"].default_value = emission_strength
    return material


def polyhaven_texture(name):
    return POLYHAVEN / f"{name}.jpg"


def add_bevel_box(name, size, target, bevel, segments=3, location=(0, 0, 0)):
    """A rounded box: a cube scaled to size with its bevel modifier applied."""
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=location)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = size
    bpy.ops.object.transform_apply(scale=True)
    modifier = obj.modifiers.new("Bevel", "BEVEL")
    modifier.width = bevel
    modifier.segments = segments
    modifier.limit_method = "NONE"
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    _move_to(obj, target)
    return obj


def add_cylinder(name, radius, depth, target, vertices=16, location=(0, 0, 0), rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location, rotation=rotation)
    obj = bpy.context.active_object
    obj.name = name
    _move_to(obj, target)
    return obj


def _move_to(obj, target):
    for owner in list(obj.users_collection):
        owner.objects.unlink(obj)
    target.objects.link(obj)


def assign(obj, material):
    obj.data.materials.clear()
    obj.data.materials.append(material)


def join(objects, name):
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    joined = bpy.context.active_object
    joined.name = name
    return joined


def shade_smooth(obj, smooth=True):
    obj.data.polygons.foreach_set("use_smooth", [smooth] * len(obj.data.polygons))
