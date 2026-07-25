import { memo, useCallback, useEffect, useState } from 'react';
import { ImageOff } from 'lucide-react';

/**
 * 響應式 picture；原生 loading 屬性處理延遲載入。
 * awaitDecode: Modal 大圖 decode 完成後再觸發 onLoad，減少開啟抖動
 */
function OptimizedImage({
  src,
  alt = '',
  className = '',
  imgKey,
  webpSrcSet,
  avifSrcSet,
  sizes,
  priority = false,
  awaitDecode = false,
  errorFallback = null,
  onLoad,
  onError,
  ...imgProps
}) {
  const [hasError, setHasError] = useState(false);
  const [usePlainImg, setUsePlainImg] = useState(false);
  const usePicture = !usePlainImg && Boolean((webpSrcSet || avifSrcSet) && sizes);

  useEffect(() => {
    setHasError(false);
    setUsePlainImg(false);
  }, [src, imgKey, webpSrcSet, avifSrcSet]);

  const handleLoad = useCallback(
    async (e) => {
      const img = e.currentTarget;
      if (awaitDecode && typeof img.decode === 'function') {
        try {
          await img.decode();
        } catch {
          /* 解碼失敗仍顯示，避免卡住 skeleton */
        }
      }
      onLoad?.(e);
    },
    [awaitDecode, onLoad],
  );

  const handleError = useCallback(
    (e) => {
      if (usePicture && !usePlainImg) {
        setUsePlainImg(true);
        return;
      }
      setHasError(true);
      onError?.(e);
    },
    [onError, usePicture, usePlainImg],
  );

  if (!src) return null;

  const mediaClass = className.includes('card-image-media')
    ? className
    : `card-image-media ${className}`.trim();

  if (!hasError) {
    const img = (
      <img
        src={src}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding="async"
        draggable={false}
        onLoad={handleLoad}
        onError={handleError}
        className={mediaClass}
        {...imgProps}
      />
    );

    if (usePicture) {
      return (
        <picture key={imgKey ?? src} className="absolute inset-0 block h-full w-full">
          {avifSrcSet && (
            <source type="image/avif" srcSet={avifSrcSet} sizes={sizes} />
          )}
          {webpSrcSet && (
            <source type="image/webp" srcSet={webpSrcSet} sizes={sizes} />
          )}
          {img}
        </picture>
      );
    }

    return img;
  }

  if (errorFallback) return errorFallback;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
      <ImageOff className="mb-2 h-8 w-8" aria-hidden strokeWidth={1.75} />
      <div className="px-2 text-center text-xs">找不到圖片</div>
    </div>
  );
}

export default memo(OptimizedImage);
