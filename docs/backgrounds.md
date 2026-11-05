# Background collection

The original `/hero-dusk.webp` remains unchanged and is the default. The header's image button opens a live-preview chooser. Selection is stored only in this browser under `scansend-background`; no backend or shared-link changes are made. If browser storage is unavailable, selection still works for the current session.

Three wallpapers were created with the built-in image-generation tool, then encoded as WebP for the app. Full-size images and 400 x 225 chooser thumbnails are in `frontend/public/backgrounds/`. They are same-origin assets; no external image host or image API is needed at runtime.

Light/dark readability overlays and reduced-transparency preferences remain in place. Only chooser thumbnails and the selected full wallpaper are loaded during normal browsing. The PWA build also precaches the collection for offline use.

## Final generation prompts

### alpine

Use case: photorealistic-natural. Asset type: full-viewport landscape background for a modern liquid-glass file sharing web app. Primary request: a serene misty alpine lake at early dawn, still water reflecting layers of distant mountains and a sparse pine shoreline, soft sage green and cool blue-gray atmosphere. Photorealistic fine natural texture, premium landscape photography, subtle diffused light, wide 16:9 composition. Quiet low-detail center with generous atmospheric negative space for translucent UI panels, recognizable landscape across the whole frame and a useful center crop on phones. No people, buildings, text, logos, watermarks, UI, borders, collage, or harsh bright sun. One continuous edge-to-edge wallpaper.

### coast

Use case: photorealistic-natural. Asset type: full-viewport landscape background for a modern liquid-glass file sharing web app. Primary request: a tranquil lavender coast at blue hour, expansive calm sea, layered headlands fading into hazy distance, soft lavender-pink sky and deep periwinkle blue water, a subtle warm peach glow on the horizon. Photorealistic fine natural texture, premium landscape photography, restrained colors, wide 16:9 composition. Quiet low-detail center and generous atmospheric negative space for translucent UI panels, attractive center crop on phones. No people, boats, buildings, text, logos, watermarks, UI, borders, collage, or harsh bright sun. One continuous edge-to-edge wallpaper.

### pearl

Use case: stylized-concept. Asset type: full-viewport landscape wallpaper for a clean modern liquid-glass web app. Primary request: elegant abstract pearl glass waves, broad flowing translucent frosted-glass ribbons with soft organic curvature, subtle icy blue, pale silver and faint lilac iridescence, gently lit studio rendering with realistic refraction and satin-soft depth. Wide 16:9 composition, refined minimal premium design, quiet open center and very low-frequency detail so UI text remains legible, attractive center crop on phones. Restrained highlights, no harsh white glare. No text, logos, watermarks, UI, borders, collage, objects, neon colors or floating bubbles. One continuous edge-to-edge wallpaper.
