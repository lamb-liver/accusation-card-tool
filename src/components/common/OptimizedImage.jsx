import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { ImageOff } from 'lucide-react';
import { preloadImage, schedulePrefetch } from '../../utils/imageHints.js';

const IO_ROOT_MARGIN = '220px 0px';
const IO_FALLBACK_MS = 250;
const IO_DELAY_FALLBACK_MS = 3000;

/**
 * 響應式 picture + 延遲載入 + preload（僅 fallback 單圖）
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
  hintOnly = false,
  awaitDecode = false,
  rootRef,
  placeholderClassName = 'absolute inset-0 animate-pulse bg-neutral-800',
  errorFallback = null,
  onLoad,
  onError,
  ...imgProps
}) {
  const [shouldLoad, setShouldLoad] = useState(priority);
  const [hasError, setHasError] = useState(false);
  const [usePlainImg, setUsePlainImg] = useState(false);
  const imgRef = useRef(null);
  const usePicture = !usePlainImg && Boolean((webpSrcSet || avifSrcSet) && sizes);

  /**
   * 換圖或卸載時清空 src，釋放 decoded bitmap。
   * lazy 圖在首次 effect 時 <img> 尚未掛載（shouldLoad=false → ref 為 null），
   * 因此渲染元素切換的 state 也要列入 deps，掛載後重新捕捉元素。
   */
  useEffect(() => {
    const img = imgRef.current;
    return () => {
      if (img) {
        img.removeAttribute('src');
        img.src = '';
      }
    };
  }, [src, imgKey, shouldLoad, usePlainImg, hasError]);

  useEffect(() => {
    setHasError(false);
    setUsePlainImg(false);
  }, [src, imgKey, webpSrcSet, avifSrcSet]);

  useEffect(() => {
    if (!src) return;
    if (priority) preloadImage(src);
    else if (hintOnly) schedulePrefetch(src);
  }, [src, priority, hintOnly]);

  useEffect(() => {
    if (hintOnly) return undefined;
    if (priority) {
      setShouldLoad(true);
      return undefined;
    }

    setShouldLoad(false);

    if (typeof IntersectionObserver === 'undefined') {
      const t = setTimeout(() => setShouldLoad(true), IO_FALLBACK_MS);
      return () => clearTimeout(t);
    }

    let disposed = false;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          if (!disposed) setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: IO_ROOT_MARGIN },
    );

    const node = rootRef?.current;
    if (node) observer.observe(node);

    const delayFallback = setTimeout(() => {
      if (!disposed) setShouldLoad(true);
      observer.disconnect();
    }, IO_DELAY_FALLBACK_MS);

    return () => {
      disposed = true;
      observer.disconnect();
      clearTimeout(delayFallback);
    };
  }, [src, imgKey, priority, hintOnly, rootRef]);

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

  if (hintOnly) return null;
  if (!src) return null;

  const mediaClass = className.includes('card-image-media')
    ? className
    : `card-image-media ${className}`.trim();

  if (!hasError && shouldLoad) {
    const img = (
      <img
        ref={imgRef}
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

  if (!hasError && !shouldLoad) {
    return <div className={placeholderClassName} aria-hidden />;
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
