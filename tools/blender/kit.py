"""Shared helpers for building game assets in Blender. Load with exec(open(path).read())."""
import bpy, math, os

OUT = "/home/subhradeep/Game/Infrastructure AI Tycoon/src/renderer/public/models"
os.makedirs(OUT, exist_ok=True)


def clear():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete()
    for m in list(bpy.data.meshes):
        if m.users == 0:
            bpy.data.meshes.remove(m)


def mat(name, col=(0.8, 0.8, 0.8), metal=0.0, rough=0.55, emit=None, strength=2.0):
    m = bpy.data.materials.get(name)
    if m:
        return m
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    b.inputs["Base Color"].default_value = (*col, 1)
    b.inputs["Metallic"].default_value = metal
    b.inputs["Roughness"].default_value = rough
    if emit:
        b.inputs["Emission Color"].default_value = (*emit, 1)
        b.inputs["Emission Strength"].default_value = strength
    return m


def box(name, loc, size, m, bevel=0.0, parent=None):
    bpy.ops.mesh.primitive_cube_add(location=loc)
    o = bpy.context.object
    o.name = name
    o.scale = (size[0] / 2, size[1] / 2, size[2] / 2)
    bpy.ops.object.transform_apply(scale=True)
    o.data.materials.append(m)
    if bevel > 0:
        md = o.modifiers.new("b", "BEVEL")
        md.width = bevel
        md.segments = 2
    if parent:
        o.parent = parent
    return o


def cyl(name, loc, r, h, m, verts=24, parent=None, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=h, location=loc, rotation=rot)
    o = bpy.context.object
    o.name = name
    o.data.materials.append(m)
    if parent:
        o.parent = parent
    return o


def root(name):
    bpy.ops.object.empty_add(location=(0, 0, 0))
    e = bpy.context.object
    e.name = name
    return e


def export(name, r):
    bpy.ops.object.select_all(action='DESELECT')
    r.select_set(True)
    for c in r.children_recursive:
        c.select_set(True)
    bpy.context.view_layer.objects.active = r
    p = os.path.join(OUT, name + ".glb")
    bpy.ops.export_scene.gltf(filepath=p, use_selection=True, export_format='GLB', export_apply=True, export_yup=True)
    return os.path.getsize(p)


SHELL = mat("Shell", (0.86, 0.86, 0.84), 0.2, 0.45)
DARK = mat("Dark", (0.10, 0.11, 0.13), 0.5, 0.4)
MESH = mat("Mesh", (0.20, 0.21, 0.24), 0.6, 0.5)
STEEL = mat("Steel", (0.62, 0.64, 0.66), 0.9, 0.3)
GREEN = mat("Led", (0.05, 0.05, 0.05), emit=(0.2, 0.85, 0.35), strength=4)
AMBER = mat("Amber", (0.05, 0.05, 0.05), emit=(1.0, 0.55, 0.1), strength=4)
BLUE = mat("Coolant", (0.15, 0.42, 0.85), 0.1, 0.25)
ORANGE = mat("Safety", (0.95, 0.45, 0.1), 0.1, 0.5)
YELLOW = mat("Hazard", (0.95, 0.78, 0.15), 0.1, 0.5)
PANEL = mat("Solar", (0.08, 0.14, 0.32), 0.6, 0.15)
WHITE = mat("White", (0.94, 0.94, 0.93), 0.0, 0.5)
CONC = mat("Concrete", (0.72, 0.71, 0.68), 0.0, 0.85)
GREY = mat("Grey", (0.55, 0.57, 0.6), 0.3, 0.5)
