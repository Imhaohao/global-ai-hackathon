"""Coffee bushes, the rust-spotted hero leaves, Grevillea shade trees and banana plants, built from numpy arrays."""

import math

import numpy as np

import meshkit
from leafshape import leaf_half_width


class Parts:
    """Accumulates geometry for one mesh with several material slots."""

    def __init__(self):
        self.vertices, self.faces, self.uvs, self.colors, self.slots = [], [], [], [], []
        self.count = 0

    def add(self, vertices, faces, uvs, colors, slot):
        vertices = np.asarray(vertices, dtype=float)
        uvs = np.asarray(uvs, dtype=float)
        colors = np.asarray(colors, dtype=float)
        for face in faces:
            shifted = tuple(index + self.count for index in face)
            self.faces.append(shifted)
            self.uvs.append(uvs[list(face)])
            self.colors.append(colors[list(face)])
            self.slots.append(slot)
        self.vertices.append(vertices)
        self.count += len(vertices)

    def build(self, name, target, materials):
        return meshkit.mesh_object(
            name,
            np.vstack(self.vertices),
            self.faces,
            target,
            uvs=np.vstack(self.uvs),
            colors=np.vstack(self.colors),
            materials=materials,
            material_indices=self.slots,
        )


def rotation_matrix(forward, up_hint=(0.0, 0.0, 1.0)):
    forward = np.asarray(forward, dtype=float)
    forward /= np.linalg.norm(forward)
    side = np.cross(up_hint, forward)
    if np.linalg.norm(side) < 1e-6:
        side = np.array([0.0, 1.0, 0.0])
    side /= np.linalg.norm(side)
    up = np.cross(forward, side)
    return np.column_stack((forward, side, up))


def leaf_geometry(length, along, across, fold=0.25, arch=0.12, wave=0.012, phase=0.0, mirror=False):
    """A leaf blade in local space: stalk at the origin, pointing +x, blade across y, upper surface facing +z."""
    s_values = np.linspace(0.0, 1.0, along)
    w_values = np.linspace(-1.0, 1.0, across)
    vertices, uvs = [], []
    for s in s_values:
        half = float(leaf_half_width(s))
        for w in w_values:
            y = w * half * length / 2.0
            z = abs(y) * math.tan(fold) - arch * length * s * s + wave * length * math.sin(s * 19.0 + phase) * abs(w) ** 1.5
            vertices.append((s * length, y, z))
            v = 0.5 + w * half
            uvs.append((s, v if mirror else 1.0 - v))
    faces = [tuple(reversed(face)) for face in meshkit.grid_faces(along, across)]
    return np.array(vertices), faces, np.array(uvs)


def tube(points, radii, sides):
    """A tapered tube through `points`; returns vertices, quad faces and simple uvs."""
    points = np.asarray(points, dtype=float)
    vertices, uvs = [], []
    for index, point in enumerate(points):
        direction = points[min(index + 1, len(points) - 1)] - points[max(index - 1, 0)]
        frame = rotation_matrix(direction, up_hint=(1.0, 0.0, 0.0) if abs(direction[2]) > 0.9 * np.linalg.norm(direction) else (0.0, 0.0, 1.0))
        for side in range(sides):
            angle = 2 * math.pi * side / sides
            offset = frame[:, 1] * math.cos(angle) + frame[:, 2] * math.sin(angle)
            vertices.append(point + offset * radii[index])
            uvs.append((side / sides, index / max(1, len(points) - 1)))
    faces = []
    for ring in range(len(points) - 1):
        for side in range(sides):
            a = ring * sides + side
            b = ring * sides + (side + 1) % sides
            faces.append((a, b, b + sides, a + sides))
    return np.array(vertices), faces, np.array(uvs)


def place(vertices, matrix, origin):
    return vertices @ matrix.T + origin


LEAF_SLOT, WOOD_SLOT, CHERRY_SLOT = 0, 1, 2
WHITE = (1.0, 1.0, 1.0)


def _leaf_tint(rng, young):
    if young:
        return (0.95, 1.0, 0.72)
    shade = rng.uniform(0.62, 0.9)
    return (shade, shade * rng.uniform(0.98, 1.04), shade * rng.uniform(0.85, 0.95))


def _cherry(rng):
    roll = rng.random()
    if roll < 0.55:
        return (0.62, 0.08, 0.07)
    if roll < 0.85:
        return (0.36, 0.52, 0.16)
    return (0.85, 0.42, 0.08)


OCTAHEDRON_VERTICES = np.array([(1, 0, 0), (-1, 0, 0), (0, 1, 0), (0, -1, 0), (0, 0, 1), (0, 0, -1)], dtype=float)
OCTAHEDRON_FACES = [(0, 2, 4), (2, 1, 4), (1, 3, 4), (3, 0, 4), (2, 0, 5), (1, 2, 5), (3, 1, 5), (0, 3, 5)]


class BushBuilder:
    def __init__(self, seed, detailed):
        self.rng = np.random.default_rng(seed)
        self.detailed = detailed
        self.parts = Parts()
        self.leaf_spots = []

    def add_leaf(self, origin, forward, length, young=False, roll=0.0):
        along, across = (5, 3) if self.detailed else (3, 3)
        vertices, faces, uvs = leaf_geometry(length, along, across, fold=0.22, arch=0.1, phase=self.rng.uniform(0, 6))
        matrix = rotation_matrix(forward)
        if roll:
            c, s = math.cos(roll), math.sin(roll)
            matrix = matrix @ np.array([[1, 0, 0], [0, c, -s], [0, s, c]])
        tint = _leaf_tint(self.rng, young)
        self.parts.add(place(vertices, matrix, origin), faces, uvs, [tint] * len(vertices), LEAF_SLOT)
        self.leaf_spots.append({"origin": np.array(origin), "forward": np.array(forward), "length": length, "matrix": matrix})

    def add_wood(self, points, radii):
        vertices, faces, uvs = tube(points, radii, 5 if self.detailed else 3)
        self.parts.add(vertices, faces, uvs, [WHITE] * len(vertices), WOOD_SLOT)

    def add_cherries(self, centre, along):
        count = int(self.rng.integers(4, 9))
        for _ in range(count):
            angle = self.rng.uniform(0, 2 * math.pi)
            offset = np.array([math.cos(angle) * 0.018, math.sin(angle) * 0.018, self.rng.uniform(-0.02, 0.005)])
            centre_point = centre + offset + along * self.rng.uniform(-0.015, 0.015)
            radius = self.rng.uniform(0.0075, 0.0095)
            vertices = OCTAHEDRON_VERTICES * radius * np.array([1.0, 1.0, 1.15]) + centre_point
            colour = _cherry(self.rng)
            self.parts.add(vertices, OCTAHEDRON_FACES, np.zeros((6, 2)), [colour] * 6, CHERRY_SLOT)

    def lateral(self, base, heading, length):
        direction = np.array([math.cos(heading), math.sin(heading), 0.0])
        steps = 7
        points = []
        for step in range(steps):
            p = step / (steps - 1)
            points.append(base + direction * p * length + np.array([0, 0, 0.06 * p * length - 0.22 * length * p * p]))
        points = np.array(points)
        self.add_wood(points, np.linspace(0.008, 0.003, steps))
        pairs = max(2, int(length / (0.055 if self.detailed else 0.11)))
        for pair in range(pairs):
            p = 0.22 + 0.78 * pair / max(1, pairs - 1)
            node = points[min(int(p * (steps - 1)), steps - 1)]
            along = direction + np.array([0, 0, -0.44 * p * length])
            along /= np.linalg.norm(along)
            side = np.cross((0, 0, 1), along)
            side /= np.linalg.norm(side)
            leaf_length = self.rng.uniform(0.12, 0.16) * (1.0 - 0.25 * p)
            for sign in (-1, 1):
                outward = side * sign + along * 0.55 + np.array([0, 0, -self.rng.uniform(0.1, 0.35)])
                self.add_leaf(node, outward, leaf_length, young=p > 0.92, roll=sign * self.rng.uniform(0.05, 0.25))
            if self.detailed and 0.2 < p < 0.65 and self.rng.random() < 0.55:
                self.add_cherries(node + np.array([0, 0, -0.012]), along)
        tip = points[-1]
        self.add_leaf(tip, direction + np.array([0, 0, 0.2]), 0.08, young=True)

    def stem(self, root, lean, height):
        top = root + np.array([lean[0] * height, lean[1] * height, height])
        points = [root + (top - root) * t for t in np.linspace(0, 1, 6)]
        self.add_wood(points, np.linspace(0.022, 0.006, 6))
        tier_heights = np.arange(0.3, height - 0.05, 0.1 if self.detailed else 0.16)
        heading = self.rng.uniform(0, 2 * math.pi)
        for tier, z in enumerate(tier_heights):
            t = z / height
            base = root + (top - root) * t
            length = (0.22 + 0.62 * (1.0 - t) ** 0.75) * self.rng.uniform(0.85, 1.15)
            heading += math.pi / 2 + self.rng.uniform(-0.25, 0.25)
            for offset in (0.0, math.pi):
                if self.rng.random() < 0.08:
                    continue
                self.lateral(base, heading + offset, length)
        for crown in range(4):
            angle = crown * math.pi / 2 + heading
            self.add_leaf(top, (math.cos(angle), math.sin(angle), 0.9), 0.07, young=True)

    def build(self):
        stems = int(self.rng.integers(2, 4))
        height = self.rng.uniform(1.5, 1.8)
        for index in range(stems):
            angle = 2 * math.pi * index / stems + self.rng.uniform(-0.4, 0.4)
            lean = (math.cos(angle) * 0.12, math.sin(angle) * 0.12)
            root = np.array([math.cos(angle) * 0.05, math.sin(angle) * 0.05, 0.0])
            self.stem(root, lean, height * self.rng.uniform(0.9, 1.05))
        return self


SPRAY_LENGTH = 0.75


class CardBushBuilder:
    """A coffee bush whose laterals are bent alpha cards carrying a painted spray of leaves (coffee_spray.png).
    Material slots: 0 spray cards, 1 wood."""

    def __init__(self, seed, detailed):
        self.rng = np.random.default_rng(seed)
        self.detailed = detailed
        self.parts = Parts()

    def card(self, base, heading, length, lift=0.06, droop=0.24, roll=0.0):
        direction = np.array([math.cos(heading), math.sin(heading), 0.0])
        side = np.array([-math.sin(heading), math.cos(heading), 0.0])
        half_width = length * 0.5 * 0.5
        along_count = 5 if self.detailed else 3
        vertices, uvs = [], []
        for a in range(along_count):
            p = a / (along_count - 1)
            spine = base + direction * p * length + np.array([0, 0, lift * p * length - droop * length * p * p])
            for k, w in enumerate((-1.0, 0.0, 1.0)):
                ridge = 0.0 if w else 0.035 * length
                tilt = w * roll * half_width
                vertices.append(spine + side * w * half_width + np.array([0, 0, ridge - 0.25 * abs(w) * half_width * p + tilt]))
                uvs.append((p, 0.5 + 0.5 * w))
        faces = meshkit.grid_faces(along_count, 3)
        shade = self.rng.uniform(0.78, 1.0)
        self.parts.add(np.array(vertices), faces, np.array(uvs), [(shade, shade, shade)] * len(vertices), 0)

    def wood(self, points, radii):
        vertices, faces, uvs = tube(points, radii, 5 if self.detailed else 3)
        self.parts.add(vertices, faces, uvs, [WHITE] * len(vertices), 1)

    def stem(self, root, lean, height):
        top = root + np.array([lean[0] * height, lean[1] * height, height])
        self.wood([root + (top - root) * t for t in np.linspace(0, 1, 5)], np.linspace(0.024, 0.007, 5))
        heading = self.rng.uniform(0, 2 * math.pi)
        tiers = np.arange(0.28, height - 0.02, 0.095 if self.detailed else 0.13)
        for z in tiers:
            t = z / height
            base = root + (top - root) * t
            length = (0.22 + 0.62 * (1.0 - t) ** 0.75) * self.rng.uniform(0.85, 1.15)
            heading += math.pi / 2 + self.rng.uniform(-0.35, 0.35)
            for offset in (0.0, math.pi):
                if self.rng.random() < 0.06:
                    continue
                self.card(base, heading + offset + self.rng.uniform(-0.2, 0.2), length, roll=self.rng.uniform(-0.35, 0.35))
                if self.detailed or self.rng.random() < 0.5:
                    self.card(base + np.array([0, 0, 0.03]), heading + offset + self.rng.uniform(-0.5, 0.5), length * 0.8, lift=0.25, droop=0.5, roll=self.rng.choice([-1.0, 1.0]) * self.rng.uniform(0.9, 1.3))
        for crown in range(3):
            self.card(top - np.array([0, 0, 0.05]), heading + crown * 2.1, 0.26, lift=0.9, droop=0.3)

    def build(self):
        stems = int(self.rng.integers(2, 4))
        height = self.rng.uniform(1.55, 1.85)
        for index in range(stems):
            angle = 2 * math.pi * index / stems + self.rng.uniform(-0.4, 0.4)
            lean = (math.cos(angle) * 0.1, math.sin(angle) * 0.1)
            root = np.array([math.cos(angle) * 0.05, math.sin(angle) * 0.05, 0.0])
            self.stem(root, lean, height * self.rng.uniform(0.9, 1.05))
        return self


def coffee_bush(name, seed, detailed, target, materials):
    builder = CardBushBuilder(seed, detailed).build()
    obj = builder.parts.build(name, target, materials)
    return obj, builder


def hero_bush(name, target, materials, rust_materials, camera_direction, origin, leaf_count=6):
    """The bush that carries the six rust leaves. Six leaves facing the camera are swapped for rust leaves."""
    builder = BushBuilder(4242, True)
    builder.build()
    facing = np.asarray(camera_direction, dtype=float)
    facing /= np.linalg.norm(facing)
    candidates = []
    for index, spot in enumerate(builder.leaf_spots):
        height = spot["origin"][2]
        outward = spot["origin"][:2] / max(1e-6, np.linalg.norm(spot["origin"][:2]))
        score = float(np.dot(outward, facing[:2])) + 0.6 * float(np.dot(spot["forward"][:2] / max(1e-6, np.linalg.norm(spot["forward"][:2])), facing[:2]))
        if 0.75 < height < 1.35 and np.linalg.norm(spot["origin"][:2]) > 0.25 and spot["length"] > 0.09:
            candidates.append((score, index))
    candidates.sort(reverse=True)
    chosen = []
    for _, index in candidates:
        if all(np.linalg.norm(builder.leaf_spots[index]["origin"] - builder.leaf_spots[other]["origin"]) > 0.12 for other in chosen):
            chosen.append(index)
        if len(chosen) == leaf_count:
            break
    removed = _strip_leaves(builder, chosen)
    bush = builder.parts.build(name, target, materials)
    bush.location = origin
    rust_leaves = []
    for rank, spot in enumerate(removed):
        scale = 1.55 if rank == 0 else 1.2 + 0.05 * rank
        vertices, faces, uvs = leaf_geometry(spot["length"] * scale, 22, 9, fold=0.2, arch=0.1, wave=0.01, phase=rank, mirror=rank % 2 == 1)
        world = place(vertices, spot["matrix"], spot["origin"])
        material = rust_materials[0] if rank == 0 else rust_materials[1]
        leaf = meshkit.mesh_object(f"RustLeaf_{rank + 1}", world, faces, target, uvs=meshkit.loop_values(faces, uvs), materials=[material])
        leaf.location = origin
        leaf["rust_rank"] = rank + 1
        rust_leaves.append(leaf)
    return bush, rust_leaves


def _strip_leaves(builder, chosen_indices):
    """Rebuilds the bush parts without the chosen leaves, returning those leaves' placements."""
    chosen = set(chosen_indices)
    original = builder.leaf_spots
    removed = [original[index] for index in chosen_indices]
    keep_rng_state = builder.rng.bit_generator.state
    builder.rng = np.random.default_rng(4242)
    builder.parts = Parts()
    builder.leaf_spots = []
    counter = {"index": -1}
    add_leaf = builder.add_leaf

    def filtered_leaf(origin, forward, length, young=False, roll=0.0):
        counter["index"] += 1
        if counter["index"] in chosen:
            builder.rng.uniform(0, 6)
            _leaf_tint(builder.rng, young)
            return
        add_leaf(origin, forward, length, young, roll)

    builder.add_leaf = filtered_leaf
    builder.build()
    builder.rng.bit_generator.state = keep_rng_state
    return removed


def grevillea(name, height, seed, target, bark_material, foliage_material):
    rng = np.random.default_rng(seed)
    parts = Parts()
    trunk_points = [np.array([0.3 * math.sin(t * 2.1 + seed), 0.3 * math.cos(t * 1.7 + seed), t * height]) * np.array([t, t, 1]) for t in np.linspace(0, 1, 9)]
    vertices, faces, uvs = tube(trunk_points, np.linspace(0.26, 0.05, 9), 7)
    parts.add(vertices, faces, uvs * np.array([1, 4]), [WHITE] * len(vertices), 0)
    card_vertices = np.array([(-0.5, 0, 0), (0.5, 0, 0), (0.5, 0, 1), (-0.5, 0, 1)], dtype=float)
    card_uvs = np.array([(0, 0), (1, 0), (1, 1), (0, 1)], dtype=float)
    for _ in range(46):
        t = rng.uniform(0.3, 1.0)
        index = min(int(t * 8), 7)
        anchor = trunk_points[index] + (trunk_points[index + 1] - trunk_points[index]) * (t * 8 - index)
        spread = (1.0 - t) * 2.2 + 0.6
        angle = rng.uniform(0, 2 * math.pi)
        centre = anchor + np.array([math.cos(angle) * spread * rng.uniform(0.3, 1.0), math.sin(angle) * spread * rng.uniform(0.3, 1.0), rng.uniform(-0.6, 0.4)])
        size = rng.uniform(1.6, 2.4)
        for cross in (0.0, math.pi / 2):
            yaw = angle + cross
            c, s = math.cos(yaw), math.sin(yaw)
            matrix = np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]])
            quad = place(card_vertices * size, matrix, centre - np.array([0, 0, size * 0.45]))
            shade = rng.uniform(0.75, 1.0)
            parts.add(quad, [(0, 1, 2, 3)], card_uvs, [(shade, shade, shade)] * 4, 1)
    return parts.build(name, target, [bark_material, foliage_material])


def banana(name, seed, target, stem_material, leaf_material):
    rng = np.random.default_rng(seed)
    parts = Parts()
    height = rng.uniform(2.2, 2.8)
    vertices, faces, uvs = tube([np.array([0, 0, z]) for z in np.linspace(0, height, 5)], np.linspace(0.2, 0.13, 5), 8)
    parts.add(vertices, faces, uvs, [WHITE] * len(vertices), 0)
    top = np.array([0.0, 0.0, height])
    for index in range(7):
        heading = index * 2.4 + rng.uniform(-0.3, 0.3)
        direction = np.array([math.cos(heading), math.sin(heading), 0.0])
        side = np.cross((0, 0, 1), direction)
        length = rng.uniform(1.6, 2.2)
        width = rng.uniform(0.42, 0.55)
        droop = rng.uniform(1.0, 1.6)
        along_count, across = 9, 3
        verts, leaf_uvs = [], []
        for a in range(along_count):
            p = a / (along_count - 1)
            spine = top + direction * p * length * 0.9 + np.array([0, 0, 1.1 * p - droop * p * p])
            half = width * math.sin(math.pi * min(1.0, 0.15 + p * 0.95)) * 0.5
            for k in range(across):
                w = -1 + k
                verts.append(spine + side * w * half + np.array([0, 0, -0.08 * abs(w)]))
                leaf_uvs.append((p, 0.5 + 0.5 * w))
        leaf_faces = meshkit.grid_faces(along_count, across)
        parts.add(np.array(verts), leaf_faces, np.array(leaf_uvs), [WHITE] * len(verts), 1)
    return parts.build(name, target, [stem_material, leaf_material])
