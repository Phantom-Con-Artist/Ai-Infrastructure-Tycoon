"""Rack v2: open-front cabinet, 8-GPU server node, blanking panel, top-of-rack switch.
Run inside Blender:  exec(open('<repo>/tools/blender/racks_v2.py').read())
Blender is Z-up; glTF export converts to Y-up. Front of every model faces Blender -Y (glTF +Z).
Server slots: 8 x 0.255 m starting at z=0.12 (matches HallEditor's stacking)."""
import os
exec(open(os.path.join(os.path.dirname(os.path.abspath("/home/subhradeep/Game/Infrastructure AI Tycoon/tools/blender/kit.py")), "kit.py")).read())

ACCENT = mat("Accent", (0.95, 0.95, 0.95), 0.2, 0.35)          # tinted per instance (vendor colour)
SIDE = mat("RackSide", (0.20, 0.22, 0.26), 0.55, 0.38)
FRAME = mat("RackFrame", (0.13, 0.14, 0.16), 0.6, 0.35)
GRILLE = mat("Grille", (0.07, 0.075, 0.09), 0.5, 0.6)
FIBER = mat("Fiber", (0.98, 0.78, 0.12), 0.05, 0.5)
PORT = mat("Port", (0.03, 0.03, 0.04), emit=(0.25, 0.55, 1.0), strength=5)
HEAT = mat("Heatsink", (0.55, 0.57, 0.6), 0.95, 0.25)


def merged(name, r):
    """Join every child mesh that shares a material, so one model = a handful of draw calls."""
    for c in list(r.children):
        for md in c.modifiers:
            bpy.context.view_layer.objects.active = c
            bpy.ops.object.modifier_apply(modifier=md.name)
    groups = {}
    for c in r.children:
        groups.setdefault(c.data.materials[0].name, []).append(c)
    for mname, objs in groups.items():
        bpy.ops.object.select_all(action='DESELECT')
        for o in objs:
            o.select_set(True)
        bpy.context.view_layer.objects.active = objs[0]
        if len(objs) > 1:
            bpy.ops.object.join()
        objs[0].name = mname
    return export(name, r)


def rack():
    clear()
    r = root("rack")
    W, D = 0.70, 1.10
    box("plinth", (0, 0, 0.04), (W, D, 0.08), FRAME, parent=r)
    for sx in (-1, 1):                                  # side panels (rows read as solid aisles)
        box(f"side{sx}", (sx * (W / 2 - 0.006), 0, 1.19), (0.012, D, 2.22), SIDE, parent=r)
        for sy in (-1, 1):                              # corner posts
            box(f"post{sx}{sy}", (sx * 0.31, sy * 0.51, 1.19), (0.035, 0.035, 2.22), FRAME, parent=r)
    box("roof", (0, 0, 2.31), (W, D, 0.04), SIDE, parent=r)
    for sy in (-1, 1):                                  # open front/rear: top + bottom rails only
        box(f"rail_lo{sy}", (0, sy * 0.51, 0.1), (W - 0.04, 0.03, 0.04), FRAME, parent=r)
    box("tor", (0, -0.02, 2.215), (0.6, 0.98, 0.07), FRAME, parent=r)         # top-of-rack switch
    box("torports", (0.04, -0.512, 2.215), (0.44, 0.006, 0.022), PORT, parent=r)
    box("label", (-0.24, -0.53, 2.28), (0.12, 0.006, 0.03), WHITE, parent=r)
    box("ladder", (0, 0, 2.42), (0.30, D, 0.02), FRAME, parent=r)              # cable ladder
    box("fibre", (0.06, 0, 2.44), (0.08, D, 0.025), FIBER, parent=r)           # thin yellow fibre bundle
    for sy in (-1, 1):
        box(f"trayleg{sy}", (0, sy * 0.4, 2.37), (0.02, 0.02, 0.08), FRAME, parent=r)
    box("torportsR", (0, 0.512, 2.215), (0.5, 0.006, 0.022), PORT, parent=r)
    return merged("rack", r)


def server():
    clear()
    r = root("server")
    box("chassis", (0, 0.01, 0.1275), (0.6, 0.98, 0.245), GRILLE, parent=r)
    box("handleL", (-0.29, -0.495, 0.1275), (0.02, 0.02, 0.2), ACCENT, parent=r)
    box("handleR", (0.29, -0.495, 0.1275), (0.02, 0.02, 0.2), ACCENT, parent=r)
    for i in range(8):                                  # 8 GPU sleds across the front
        x = -0.245 + i * 0.07
        box(f"sled{i}", (x, -0.49, 0.115), (0.062, 0.02, 0.19), HEAT, parent=r)
        for f in range(5):                              # heatsink fins
            box(f"fin{i}_{f}", (x, -0.5, 0.045 + f * 0.035), (0.054, 0.012, 0.006), FRAME, parent=r)
        box(f"tab{i}", (x, -0.502, 0.222), (0.05, 0.012, 0.018), ACCENT, parent=r)
        box(f"led{i}", (x + 0.02, -0.503, 0.2), (0.008, 0.006, 0.008), GREEN, parent=r)
    box("psu", (0, 0.49, 0.1275), (0.56, 0.02, 0.2), FRAME, parent=r)
    for i in range(4):                                  # rear fans
        cyl(f"fan{i}", (-0.2 + i * 0.105, 0.5, 0.14), 0.045, 0.012, MESH, verts=16, parent=r, rot=(math.pi / 2, 0, 0))
        cyl(f"hub{i}", (-0.2 + i * 0.105, 0.507, 0.14), 0.014, 0.006, STEEL, verts=10, parent=r, rot=(math.pi / 2, 0, 0))
    for i in range(4):                                  # network ports + status
        box(f"nic{i}", (-0.24 + i * 0.06, 0.502, 0.215), (0.03, 0.006, 0.014), PORT, parent=r)
    box("rled", (0.25, 0.502, 0.215), (0.012, 0.006, 0.012), GREEN, parent=r)
    return merged("server", r)


def blank():
    clear()
    r = root("blank")
    plate = mat("Blank", (0.46, 0.48, 0.52), 0.4, 0.45)
    for sy in (-1, 1):                                  # blanking plates front and rear
        box(f"plate{sy}", (0, sy * 0.49, 0.1275), (0.6, 0.012, 0.245), plate, parent=r)
    for i in range(6):
        for sy in (-1, 1):
            box(f"vent{i}{sy}", (0, sy * 0.497, 0.035 + i * 0.037), (0.5, 0.004, 0.012), GRILLE, parent=r)
    return merged("blank", r)


print("rack", rack(), "server", server(), "blank", blank())
