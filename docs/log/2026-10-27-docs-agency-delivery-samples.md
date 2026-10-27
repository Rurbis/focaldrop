# docs(log): record the agency's delivery samples and keep videos download-only

Issue: — · PR: (este) · Autor: Rubén

## Decisiones

- **D-nueva · En el MVP los videos solo se descargan** (precisa D9, D52 y D130) — La galería entrega los videos como archivos, sueltos o dentro del ZIP. Muestra una miniatura si el navegador del admin logra sacar un cuadro (D9) y, si no, un ícono. **Reproducirlos dentro de la galería pasa a *Could*.** **Por qué:** el único video que la agencia ha grabado es un original de cámara con audio PCM sin comprimir, que los navegadores no reproducen. Mostrarlo en la galería exigiría convertirlo en un servidor, con costo y complejidad, para algo que casi no pasa. La prueba S-1 se concentra en las fotos.

## Historial

- 2026-10-27: **Muestras de entrega de la agencia: 8 JPG y 1 video, fuera del repo.** Corrigen la D130, que partía del peso del RAW. Solo se leyeron los metadatos.
  - **Fotos:** JPG exportados desde Lightroom a calidad máxima, sRGB. Pesan **11.8 MB en promedio** (2.0–23.9 MB; mediana 12.2), de 3.9 a 24 MP, y 7 de 8 son verticales. El bloque de GPS del EXIF viene **sin coordenadas**.
  - **Video:** original de cámara, H.264 1080p a 120 cuadros por segundo, ≈104 Mbps (unos 780 MB por minuto), con audio PCM sin comprimir y el índice (`moov`) al final del archivo.
  - **S3 recalculado:** una galería de 300 a 1,000 fotos pesa **3.5–12 GB**, no los 7–24 GB de la D130; los videos son raros. Con 5 a 15 galerías al mes guardadas de 1 a 3 meses, R2 almacena unos 40–350 GB, **≈ US$0.50–5 al mes** sobre el nivel gratuito (antes, 1.5–7.5).
  - **Sigue igual:** ZIP64 en la etapa 1, porque desde ~350 fotos el ZIP pasa de 4 GiB.
  - **Para el hito 1:** la subida debe poder reanudarse (S-5), porque una galería promedio (~7.7 GB) tarda ≈ 50 min con 20 Mbps de subida y ≈ 1.7 h con 10. Las vistas previas en el navegador parten de JPG de hasta 24 MP (S-1 mide memoria y tiempo). La galería debe verse bien con mayoría de fotos verticales (D134).

## Tiempo

≈ 0.3 h, el análisis de metadatos.

## Pendientes

- Preguntarle a la agencia si alguna vez entrega `.ARW` (bitácora §6).
- S-1 y S-5 (hito 1) usan estas muestras, que nunca van al repo.
