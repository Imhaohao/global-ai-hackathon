#!/bin/sh
# Compresses the raw Blender export into the GLB the deck and the reel load.
# Repeated bush meshes become EXT_mesh_gpu_instancing, geometry gets meshopt, textures become WebP.
# Named nodes (FeaturePhoneScreen, HubPhoneScreen, OfficerPhoneScreen, RustLeaf_1..6) are kept: no join, no flatten.
set -e
cd "$(dirname "$0")/.."
TMP="$(mktemp -d)"
npx --yes @gltf-transform/cli@4 dedup coffee-slope.raw.glb "$TMP/a.glb"
npx --yes @gltf-transform/cli@4 instance "$TMP/a.glb" "$TMP/b.glb" --min 2
npx --yes @gltf-transform/cli@4 prune "$TMP/b.glb" "$TMP/c.glb"
npx --yes @gltf-transform/cli@4 webp "$TMP/c.glb" "$TMP/d.glb" --quality 84
npx --yes @gltf-transform/cli@4 meshopt "$TMP/d.glb" "$TMP/e.glb" --level medium
mv "$TMP/e.glb" coffee-slope.glb.tmp
mv coffee-slope.glb.tmp coffee-slope.glb
rm -rf "$TMP"
ls -la coffee-slope.glb
