# 喵喵屋独立封面记录

## 像素画布

- 日期：2026-10-19；文件：`src/features/other/pixel-canvas/cover.png`。
- 内置 imagegen 独立生成，无参考图、外部素材或品牌标识；概念插画，不是运行截图。已核验像素猫、方格、彩色方块与铅笔，方形构图，无文字和水印。
- 提示词：Use case: stylized-concept. Generate a square standalone cover illustration for a pixel art drawing toy on a personal blog. A small square pixel mosaic canvas with a charming orange pixel cat face being filled in, a few colorful square swatches and a pencil beside it. Crisp blocky pixel geometry, restrained warm off-white background, subtle soft studio shadows, centered complete composition with generous margins, recognizable at thumbnail size. No text, no letters, no numbers, no logos, no watermark, no website UI. Concept illustration, not a screenshot. Save as a PNG image.

封面是各模块的独立图片素材，不是页面截图，也不作为运行效果、实物测量或官方产品的证据。生成图片随模块目录保存，通过 definition.ts 引用。新增模块需单独生成符合其内容的封面，不复用电子琴图片。

## 触笔电子琴

- 日期：2026-10-19。
- 文件：`src/features/other/stylophone/cover.png`。
- 方式：内置 imagegen 独立生成，无输入参考图；未使用外部图片或品牌标识。原始结果保留在本机 Codex generated_images。
- 用途：喵喵屋方形卡片的概念插画；替代原有界面截图。
- 核验：完整电子琴、金属触笔及导线，石墨色机身、银色镶嵌接触面，无网页控件、文字或水印。音片为概念表现，实际排列和命中以乐器代码为准。

提示词：

> Use case: product-mockup. Asset type: a standalone cover illustration for a personal blog's square toy-module card, depicting a stylus electronic synthesizer. Generate one polished square image, not a UI screenshot. Subject: a compact retro stylus synthesizer with a graphite enclosure, speaker grille, a wired metal stylus resting diagonally beside it, and a continuous silver contact surface with twelve lower natural-note segments interlocked with eight shorter upper accidental segments. Keys are flat conductive metal contacts, not raised piano keys. Composition: three-quarter overhead product illustration, whole instrument centered and clearly recognizable at a small thumbnail size, plenty of margin, no clipped parts. Background: clean warm off-white. Materials: matte graphite housing and brushed silver metal. A restrained elegant 3D editorial illustration, soft studio shadows, neutral charcoal and silver palette. No branding, no text, no labels, no letters or numerals, no website UI, no controls floating outside the instrument, no watermark. This is a conceptual illustration, not documentary evidence or an official product image.
