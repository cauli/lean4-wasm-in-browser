"""Build the Manifold Adventure's 3D teaching models and export them as GLB.

Run inside Blender (4.x), e.g. through the BlenderMCP socket or:
  blender --background --python scripts/blender/build-topo-models.py

Each model is a small, self-explanatory scene for one lesson:
  sphere-charts   two translucent chart caps covering a sphere, overlap visible
  torus-loops     torus with its two generator loops highlighted
  mobius-band     Möbius band, single boundary curve, normal arrows that flip
  trefoil-circle  trefoil knot and round circle: same 1-manifold, two embeddings
  sphere-triangle geodesic triangle with three right angles on a sphere
  figure-eight    figure-eight curve whose crossing fails the local line test
  tangent-plane   tangent plane and velocity arrows at one point of a sphere
  robot-arm       two circle-valued joints and their forward-kinematics endpoint

Exports go to public/game-assets/manifolds/models/.
"""

import math
import os

import bmesh
import bpy
from mathutils import Matrix, Vector

OUTPUT_DIR = os.environ.get(
    "TOPO_MODEL_DIR",
    "/Users/caulitomaz/Personal/lean4-wasm-in-browser/public/game-assets/manifolds/models",
)

TAU = 2 * math.pi

BASE_BLUE = (0.44, 0.58, 0.74, 1.0)
CHART_AMBER = (0.96, 0.62, 0.16, 0.45)
CHART_TEAL = (0.13, 0.65, 0.58, 0.45)
LOOP_CORAL = (0.95, 0.42, 0.22, 1.0)
LOOP_MAGENTA = (0.78, 0.24, 0.56, 1.0)
KNOT_VIOLET = (0.55, 0.36, 0.86, 1.0)
CIRCLE_BLUE = (0.24, 0.54, 0.9, 1.0)
MARK_RED = (0.88, 0.16, 0.16, 1.0)
PLANE_GLASS = (0.85, 0.92, 1.0, 0.32)
ARROW_GREEN = (0.2, 0.72, 0.35, 1.0)
ARROW_ORANGE = (0.96, 0.55, 0.14, 1.0)
ADA_DARK = (0.12, 0.12, 0.14, 1.0)
ROBOT_BASE = (0.055, 0.12, 0.20, 1.0)
ROBOT_FIRST = (0.95, 0.35, 0.035, 1.0)
ROBOT_SECOND = (0.00, 0.45, 0.62, 1.0)
ROBOT_JOINT = (0.72, 0.56, 0.25, 1.0)


def clear_scene():
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    for block in (bpy.data.meshes, bpy.data.curves, bpy.data.materials):
        for datum in list(block):
            if datum.users == 0:
                block.remove(datum)


def make_material(name, rgba, roughness=0.45, metallic=0.0):
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    bsdf = material.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = rgba
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    if rgba[3] < 1.0:
        bsdf.inputs["Alpha"].default_value = rgba[3]
        material.blend_method = "BLEND"
        material.use_backface_culling = False
    return material


def add_object(name, mesh, material):
    obj = bpy.data.objects.new(name, mesh)
    obj.data.materials.append(material)
    bpy.context.collection.objects.link(obj)
    for polygon in mesh.polygons:
        polygon.use_smooth = True
    return obj


def surface_mesh(name, fn, nu, nv, u_range=(0.0, TAU), v_range=(0.0, TAU), weld=False):
    """Quad grid over fn(u, v) -> (x, y, z); weld merges coincident seam verts."""
    bm = bmesh.new()
    grid = []
    for iu in range(nu + 1):
        u = u_range[0] + (u_range[1] - u_range[0]) * iu / nu
        row = []
        for iv in range(nv + 1):
            v = v_range[0] + (v_range[1] - v_range[0]) * iv / nv
            row.append(bm.verts.new(fn(u, v)))
        grid.append(row)
    for iu in range(nu):
        for iv in range(nv):
            bm.faces.new((grid[iu][iv], grid[iu + 1][iv], grid[iu + 1][iv + 1], grid[iu][iv + 1]))
    if weld:
        bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    return mesh


def uv_sphere_mesh(name, radius, cut=None, segments=64, rings=32):
    """UV sphere; cut=('above'|'below', z) keeps only that side (a chart cap)."""
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=segments, v_segments=rings, radius=radius)
    if cut:
        side, level = cut
        doomed = [
            v for v in bm.verts
            if (v.co.z < level if side == "above" else v.co.z > level)
        ]
        bmesh.ops.delete(bm, geom=doomed, context="VERTS")
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    return mesh


def tube_from_points(name, points, radius, material, cyclic=True):
    curve = bpy.data.curves.new(name, type="CURVE")
    curve.dimensions = "3D"
    curve.bevel_depth = radius
    curve.bevel_resolution = 6
    spline = curve.splines.new("POLY")
    spline.points.add(len(points) - 1)
    for point, target in zip(spline.points, points):
        point.co = (*target, 1.0)
    spline.use_cyclic_u = cyclic
    curve_obj = bpy.data.objects.new(f"{name}Curve", curve)
    bpy.context.collection.objects.link(curve_obj)
    depsgraph = bpy.context.evaluated_depsgraph_get()
    mesh = bpy.data.meshes.new_from_object(curve_obj.evaluated_get(depsgraph))
    bpy.data.objects.remove(curve_obj, do_unlink=True)
    return add_object(name, mesh, material)


def small_sphere(name, center, radius, material):
    mesh = uv_sphere_mesh(f"{name}Mesh", radius, segments=24, rings=16)
    obj = add_object(name, mesh, material)
    obj.location = center
    return obj


def cylinder(name, center, radius, depth, material, vertices=48):
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices, radius=radius, depth=depth, location=center,
    )
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(material)
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    return obj


def torus(name, center, major_radius, minor_radius, material):
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major_radius,
        minor_radius=minor_radius,
        major_segments=64,
        minor_segments=12,
        location=center,
    )
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(material)
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    return obj


def arrow(name, base, direction, length, material, shaft_radius=0.016):
    """Arrow from base along direction: cylinder shaft + cone tip."""
    direction = Vector(direction).normalized()
    align = direction.to_track_quat("Z", "Y").to_matrix().to_4x4()
    shaft_length = length * 0.62
    bm = bmesh.new()
    bmesh.ops.create_cone(
        bm, cap_ends=True, segments=16,
        radius1=shaft_radius, radius2=shaft_radius, depth=shaft_length,
        matrix=Matrix.Translation((0, 0, shaft_length / 2)),
    )
    bmesh.ops.create_cone(
        bm, cap_ends=True, segments=16,
        radius1=shaft_radius * 2.6, radius2=0.0, depth=length - shaft_length,
        matrix=Matrix.Translation((0, 0, shaft_length + (length - shaft_length) / 2)),
    )
    mesh = bpy.data.meshes.new(f"{name}Mesh")
    bm.to_mesh(mesh)
    bm.free()
    obj = add_object(name, mesh, material)
    obj.matrix_world = Matrix.Translation(base) @ align
    return obj


def slerp(a, b, t):
    angle = a.angle(b)
    if angle < 1e-9:
        return a.copy()
    return (a * math.sin((1 - t) * angle) + b * math.sin(t * angle)) / math.sin(angle)


def export_glb(name):
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=os.path.join(OUTPUT_DIR, f"{name}.glb"),
        export_format="GLB",
        export_lights=False,
        export_cameras=False,
        export_apply=True,
        export_yup=True,
    )


def build_sphere_charts():
    clear_scene()
    add_object("Sphere", uv_sphere_mesh("SphereMesh", 1.0), make_material("Base", BASE_BLUE))
    add_object(
        "NorthChart",
        uv_sphere_mesh("NorthMesh", 1.02, cut=("above", -0.28)),
        make_material("North", CHART_AMBER),
    )
    add_object(
        "SouthChart",
        uv_sphere_mesh("SouthMesh", 1.04, cut=("below", 0.28)),
        make_material("South", CHART_TEAL),
    )
    export_glb("sphere-charts")


def build_torus_loops():
    clear_scene()
    R, r = 1.0, 0.42

    def torus(u, v):
        return (
            (R + r * math.cos(v)) * math.cos(u),
            (R + r * math.cos(v)) * math.sin(u),
            r * math.sin(v),
        )

    add_object(
        "Torus", surface_mesh("TorusMesh", torus, 96, 48, weld=True),
        make_material("Base", BASE_BLUE),
    )
    lift = 1.045
    meridian = [
        ((R + lift * r * math.cos(v)) * 1.0, 0.0, lift * r * math.sin(v))
        for v in [TAU * i / 64 for i in range(64)]
    ]
    tube_from_points("MeridianLoop", meridian, 0.028, make_material("Meridian", LOOP_CORAL))
    longitude = [
        (lift * (R + r) * math.cos(u), lift * (R + r) * math.sin(u), 0.0)
        for u in [TAU * i / 96 for i in range(96)]
    ]
    tube_from_points("LongitudeLoop", longitude, 0.028, make_material("Longitude", LOOP_MAGENTA))
    export_glb("torus-loops")


def build_mobius_band():
    clear_scene()
    R, w = 1.15, 0.38

    def mobius(u, v):
        return (
            (R + v * math.cos(u / 2)) * math.cos(u),
            (R + v * math.cos(u / 2)) * math.sin(u),
            v * math.sin(u / 2),
        )

    add_object(
        "MobiusBand",
        surface_mesh("MobiusMesh", mobius, 180, 12, v_range=(-w, w), weld=True),
        make_material("Base", (0.29, 0.7, 0.65, 1.0)),
    )
    boundary = [mobius(u, w) for u in [2 * TAU * i / 256 for i in range(256)]]
    tube_from_points("Boundary", boundary, 0.024, make_material("Boundary", LOOP_CORAL))

    def normal_at(u):
        eps = 1e-4
        p = Vector(mobius(u, 0.0))
        du = (Vector(mobius(u + eps, 0.0)) - p) / eps
        dv = (Vector(mobius(u, eps)) - p) / eps
        return du.cross(dv).normalized()

    steps = 12
    for index in range(steps):
        u = TAU * index / steps
        t = index / (steps - 1)
        color = (0.2 + 0.72 * t, 0.72 - 0.55 * t, 0.32 - 0.18 * t, 1.0)
        arrow(
            f"Normal{index:02d}", mobius(u, 0.0), normal_at(u), 0.3,
            make_material(f"NormalColor{index:02d}", color),
        )
    export_glb("mobius-band")


def build_trefoil_circle():
    clear_scene()

    def trefoil(t):
        return (
            math.sin(t) + 2 * math.sin(2 * t),
            math.cos(t) - 2 * math.cos(2 * t),
            -math.sin(3 * t),
        )

    scale = 0.42
    points = [tuple(scale * c for c in trefoil(TAU * i / 200)) for i in range(200)]
    trefoil_obj = tube_from_points("Trefoil", points, 0.09, make_material("Knot", KNOT_VIOLET))
    trefoil_obj.location = (-0.85, 0.0, 0.0)
    circle = [
        (0.62 * math.cos(t), 0.62 * math.sin(t), 0.0)
        for t in [TAU * i / 96 for i in range(96)]
    ]
    circle_obj = tube_from_points("Circle", circle, 0.09, make_material("Circle", CIRCLE_BLUE))
    circle_obj.location = (1.55, 0.0, 0.0)
    export_glb("trefoil-circle")


def build_sphere_triangle():
    clear_scene()
    add_object("Sphere", uv_sphere_mesh("SphereMesh", 1.0), make_material("Base", BASE_BLUE))
    corners = [Vector((0, 0, 1)), Vector((1, 0, 0)), Vector((0, 1, 0))]
    lift = 1.008
    for index, (a, b) in enumerate(zip(corners, corners[1:] + corners[:1])):
        points = [tuple(slerp(a, b, i / 48) * lift) for i in range(49)]
        tube_from_points(
            f"Arc{index}", points, 0.024,
            make_material(f"Arc{index}Color", ARROW_ORANGE), cyclic=False,
        )
    for index, corner in enumerate(corners):
        small_sphere(f"Corner{index}", tuple(corner * lift), 0.05, make_material(f"CornerColor{index}", MARK_RED))
    export_glb("sphere-triangle")


def build_figure_eight():
    clear_scene()
    points = [
        (1.35 * math.sin(t), 0.95 * math.sin(t) * math.cos(t), 0.0)
        for t in [TAU * i / 200 for i in range(200)]
    ]
    tube_from_points("FigureEight", points, 0.07, make_material("Curve", (0.29, 0.7, 0.65, 1.0)))
    small_sphere("Crossing", (0.0, 0.0, 0.0), 0.13, make_material("Crossing", MARK_RED))
    export_glb("figure-eight")


def build_tangent_plane():
    clear_scene()
    add_object("Sphere", uv_sphere_mesh("SphereMesh", 1.0), make_material("Base", BASE_BLUE))
    point = Vector((math.sin(0.8), 0.0, math.cos(0.8))).normalized()
    normal = point.copy()
    east = Vector((0, 1, 0))
    tangent_a = normal.cross(east).normalized()
    tangent_b = normal.cross(tangent_a).normalized()

    bm = bmesh.new()
    half = 0.85
    verts = [
        bm.verts.new(point + tangent_a * sa * half + tangent_b * sb * half)
        for sa, sb in ((-1, -1), (1, -1), (1, 1), (-1, 1))
    ]
    bm.faces.new(verts)
    plane_mesh = bpy.data.meshes.new("PlaneMesh")
    bm.to_mesh(plane_mesh)
    bm.free()
    add_object("TangentPlane", plane_mesh, make_material("Glass", PLANE_GLASS))

    arrow("Velocity", tuple(point), tuple(tangent_a), 0.62, make_material("VelocityColor", ARROW_ORANGE))
    arrow("SecondDirection", tuple(point), tuple(tangent_b), 0.62, make_material("SecondColor", ARROW_GREEN))
    small_sphere("Ada", tuple(point * 1.01), 0.045, make_material("AdaColor", ADA_DARK))
    export_glb("tangent-plane")


def build_robot_arm():
    clear_scene()
    first_material = make_material("FirstLink", ROBOT_FIRST, roughness=0.34, metallic=0.15)
    second_material = make_material("SecondLink", ROBOT_SECOND, roughness=0.35, metallic=0.12)
    joint_material = make_material("Joint", ROBOT_JOINT, roughness=0.22, metallic=0.55)

    # OpenPong's small Genesis link module gives the diagram the same physical
    # language as the robot simulator. Set OPENPONG_LINK_GLB when the sibling
    # checkout is elsewhere. The fallback keeps the course model buildable on
    # its own, although it omits the module's molded details.
    default_link = os.path.abspath(os.path.join(
        os.path.dirname(__file__),
        "../../../openpong/webapp/apps/web/public/arena/models/genesis-link.glb",
    ))
    link_source = os.environ.get("OPENPONG_LINK_GLB", default_link)
    if os.path.isfile(link_source):
        before = set(bpy.data.objects)
        bpy.ops.import_scene.gltf(filepath=link_source)
        imported = [obj for obj in bpy.data.objects if obj not in before]
        mesh_objects = [obj for obj in imported if obj.type == "MESH"]
        if not mesh_objects:
            raise RuntimeError(f"No mesh found in OpenPong link asset: {link_source}")
        template = max(mesh_objects, key=lambda obj: obj.dimensions.length)
        for obj in imported:
            if obj != template:
                bpy.data.objects.remove(obj, do_unlink=True)
    else:
        bpy.ops.mesh.primitive_cube_add()
        template = bpy.context.object
        template.dimensions = (0.162, 0.21, 1.03)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        bevel = template.modifiers.new("Soft edges", "BEVEL")
        bevel.width = 0.06
        bevel.segments = 3
        bpy.context.view_layer.objects.active = template
        bpy.ops.object.modifier_apply(modifier=bevel.name)

    template_dimensions = template.dimensions.copy()
    base = Vector((0.0, 0.0, 0.42))
    elbow = Vector((2.15, 0.72, 0.58))
    tip = Vector((3.48, 2.02, 0.72))

    def place_link(obj, name, start, end, thickness, material):
        delta = end - start
        obj.name = name
        obj.location = (start + end) / 2
        obj.rotation_mode = "QUATERNION"
        obj.rotation_quaternion = delta.to_track_quat("Z", "Y")
        obj.scale = (thickness, thickness, delta.length / template_dimensions.z)
        obj.data.materials.clear()
        obj.data.materials.append(material)

    second_link = template.copy()
    second_link.data = template.data.copy()
    bpy.context.collection.objects.link(second_link)
    place_link(template, "FirstLink", base, elbow, 1.58, first_material)
    place_link(second_link, "SecondLink", elbow, tip, 1.34, second_material)

    cylinder("Workspace", (0, 0, 0.04), 3.75, 0.08,
             make_material("Workspace", ROBOT_BASE, roughness=0.70), vertices=72)
    cylinder("Base", (0, 0, 0.24), 0.74, 0.42,
             make_material("Base", ROBOT_BASE, roughness=0.32, metallic=0.35), vertices=64)
    torus("ShoulderAngle", (0, 0, 0.52), 0.92, 0.045, first_material)
    cylinder("ShoulderJoint", base, 0.43, 0.38, joint_material)
    torus("ElbowAngle", elbow, 0.62, 0.04, second_material)
    cylinder("ElbowJoint", elbow, 0.36, 0.34, joint_material)
    small_sphere("Tip", tip, 0.30,
                 make_material("TipColor", MARK_RED, roughness=0.30, metallic=0.15))
    export_glb("robot-arm")


BUILDERS = [
    build_sphere_charts,
    build_torus_loops,
    build_mobius_band,
    build_trefoil_circle,
    build_sphere_triangle,
    build_figure_eight,
    build_tangent_plane,
    build_robot_arm,
]


def main():
    for builder in BUILDERS:
        builder()
    clear_scene()
    print(f"Exported {len(BUILDERS)} models to {OUTPUT_DIR}")


main()
