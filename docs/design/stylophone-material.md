# 电子琴金属材质

日期：2026-10-19。用于演奏界面的材质表现，不代表官方产品照片或实际测量。

- 素材：`src/features/other/stylophone/brushed-aluminium.webp`。
- 来源：内置 imagegen 独立生成，无输入参考图片，无外部版权素材。
- 制作：原图保留在 Codex generated_images 的 `exec-fa17389a-c231-4fcc-b424-0b054cae9b92.png`；项目文件仅做 768×768 缩放及 WebP quality 88 压缩，约 125 kB。
- 接入：`MetalContact.svelte` 复用同一纹理，长短音片调整纵向采样比例，避免拉丝密度突变；银色反光、高光描边和主题色反馈继续由 SVG 叠加。纹理只随乐器运行模块加载。
- 轮廓：`input.ts` 的 `contactCorner` 同时生成升音片底角和左右自然音凹口；渲染与命中共用 `padPolygon`。不单独切掉升音片边角后留下不匹配的黑色空隙。

生成提示词：

> Asset type: seamless brushed aluminium material texture for a playable electronic musical instrument's conductive metal contacts. Generate a single square flat orthographic texture filling the entire image edge to edge, no object and no borders. Photorealistic satin silver aluminium, neutral cool silver-grey, dense extremely fine irregular horizontal machining hairlines with natural nonuniform spacing and tiny random micro scratches. Visible but restrained realistic metallic directional reflectance, soft broad studio reflection toward the upper left with a slightly darker lower right, soft continuous luminance variation without distinct stripe bands. Premium precision-machined metal, clean rather than distressed. No green, beige or blue color cast. No dramatic highlights, no white blown areas, no coarse striped pattern, no geometric shapes, no bevels, no frames, no text, no logo, no objects, no keyboard, no instrument. Keep the material uniformly in focus. This is a texture sheet, not a product photo.
