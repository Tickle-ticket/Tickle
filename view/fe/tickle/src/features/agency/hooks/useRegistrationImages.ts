'use client';

import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import type {
  IntroImageItem,
  RegistrationErrorTarget,
} from '@/src/features/agency/model/registrationTypes';
import {
  createImagePreviewItem,
  createIntroImageKey,
} from '@/src/features/agency/model/registrationHelpers';

/**
 * 포스터와 소개 이미지의 업로드·드래그앤드롭·미리보기를 다룹니다.
 *
 * <p>미리보기는 {@code URL.createObjectURL}로 만들기 때문에 쓰고 나면 반드시
 * 해제해야 합니다. 그러지 않으면 이미지를 바꿀 때마다 메모리가 쌓입니다.
 * 해제 시점을 놓치기 쉬워 registry ref로 직전 값을 들고 있다가 정리합니다.</p>
 *
 * <p>드래그 상태는 depth ref로 셉니다. dragenter/dragleave가 자식 요소마다
 * 발생해서, 단순히 boolean으로 두면 자식 위를 지날 때 테두리가 깜빡입니다.</p>
 *
 * @param clearFieldError 포스터를 넣으면 해당 필드의 오류 표시를 지운다
 */
export const useRegistrationImages = ({
  clearFieldError,
}: {
  clearFieldError: (target: RegistrationErrorTarget) => void;
}) => {
  const [posterImage, setPosterImage] = useState<IntroImageItem | null>(null);
  const [isPosterImageDragActive, setIsPosterImageDragActive] = useState(false);
  const [introImages, setIntroImages] = useState<IntroImageItem[]>([]);
  const [isIntroImageDragActive, setIsIntroImageDragActive] = useState(false);

  const posterImageDragDepthRef = useRef(0);
  const posterImageRegistryRef = useRef<IntroImageItem | null>(null);
  const introImageDragDepthRef = useRef(0);
  const introImageRegistryRef = useRef<IntroImageItem[]>([]);

  useEffect(() => {
    const previousImages = introImageRegistryRef.current;

    previousImages
      .filter((image) => !introImages.some((currentImage) => currentImage.id === image.id))
      .forEach((image) => {
        URL.revokeObjectURL(image.previewUrl);
      });

    introImageRegistryRef.current = introImages;
  }, [introImages]);

  useEffect(() => {
    const previousImage = posterImageRegistryRef.current;

    if (previousImage && previousImage.id !== posterImage?.id) {
      URL.revokeObjectURL(previousImage.previewUrl);
    }

    posterImageRegistryRef.current = posterImage;
  }, [posterImage]);

  useEffect(
    () => () => {
      if (posterImageRegistryRef.current) {
        URL.revokeObjectURL(posterImageRegistryRef.current.previewUrl);
      }

      introImageRegistryRef.current.forEach((image) => {
        URL.revokeObjectURL(image.previewUrl);
      });
    },
    [],
  );

  const replacePosterImage = (files: File[]) => {
    const nextPosterFile = files.find((file) => file.type.startsWith('image/'));

    if (!nextPosterFile) {
      return;
    }

    clearFieldError('poster');
    setPosterImage(createImagePreviewItem(nextPosterFile));
  };

  const appendIntroImages = (files: File[]) => {
    const imageFiles = files.filter((file) => file.type.startsWith('image/'));

    if (imageFiles.length === 0) {
      return;
    }

    setIntroImages((current) => {
      const existingKeys = new Set(current.map((image) => image.id));
      const nextImages = imageFiles
        .filter((file) => !existingKeys.has(createIntroImageKey(file)))
        .map((file) => createImagePreviewItem(file));

      return [...current, ...nextImages];
    });
  };

  const handlePosterImageInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    replacePosterImage(Array.from(event.target.files ?? []));
    event.target.value = '';
  };

  const handlePosterImageRemove = () => {
    setPosterImage(null);
  };

  const handlePosterImageDragEnter = (event: DragEvent<HTMLDivElement>) => {
    if (!event.dataTransfer.types.includes('Files')) {
      return;
    }

    event.preventDefault();
    posterImageDragDepthRef.current += 1;
    setIsPosterImageDragActive(true);
  };

  const handlePosterImageDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!event.dataTransfer.types.includes('Files')) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';

    if (!isPosterImageDragActive) {
      setIsPosterImageDragActive(true);
    }
  };

  const handlePosterImageDragLeave = (event: DragEvent<HTMLDivElement>) => {
    if (!event.dataTransfer.types.includes('Files')) {
      return;
    }

    event.preventDefault();
    posterImageDragDepthRef.current = Math.max(0, posterImageDragDepthRef.current - 1);

    if (posterImageDragDepthRef.current === 0) {
      setIsPosterImageDragActive(false);
    }
  };

  const handlePosterImageDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    posterImageDragDepthRef.current = 0;
    setIsPosterImageDragActive(false);
    replacePosterImage(Array.from(event.dataTransfer.files));
  };

  const handleIntroImageInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    appendIntroImages(Array.from(event.target.files ?? []));
    event.target.value = '';
  };

  const handleIntroImageRemove = (imageId: string) => {
    setIntroImages((current) => current.filter((image) => image.id !== imageId));
  };

  const handleIntroImageDragEnter = (event: DragEvent<HTMLDivElement>) => {
    if (!event.dataTransfer.types.includes('Files')) {
      return;
    }

    event.preventDefault();
    introImageDragDepthRef.current += 1;
    setIsIntroImageDragActive(true);
  };

  const handleIntroImageDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!event.dataTransfer.types.includes('Files')) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';

    if (!isIntroImageDragActive) {
      setIsIntroImageDragActive(true);
    }
  };

  const handleIntroImageDragLeave = (event: DragEvent<HTMLDivElement>) => {
    if (!event.dataTransfer.types.includes('Files')) {
      return;
    }

    event.preventDefault();
    introImageDragDepthRef.current = Math.max(0, introImageDragDepthRef.current - 1);

    if (introImageDragDepthRef.current === 0) {
      setIsIntroImageDragActive(false);
    }
  };

  const handleIntroImageDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    introImageDragDepthRef.current = 0;
    setIsIntroImageDragActive(false);
    appendIntroImages(Array.from(event.dataTransfer.files));
  };

  return {
    posterImage,
    setPosterImage,
    isPosterImageDragActive,
    introImages,
    setIntroImages,
    isIntroImageDragActive,

    handlePosterImageInputChange,
    handlePosterImageRemove,
    handlePosterImageDragEnter,
    handlePosterImageDragOver,
    handlePosterImageDragLeave,
    handlePosterImageDrop,

    handleIntroImageInputChange,
    handleIntroImageRemove,
    handleIntroImageDragEnter,
    handleIntroImageDragOver,
    handleIntroImageDragLeave,
    handleIntroImageDrop,
  };
};
