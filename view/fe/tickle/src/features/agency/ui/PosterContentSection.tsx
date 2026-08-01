'use client';

import Image from 'next/image';

import type { useRegistrationImages } from '@/src/features/agency/hooks/useRegistrationImages';
import type { Dispatch, RefObject, SetStateAction } from 'react';
import type { RegistrationErrorTarget } from '@/src/features/agency/model/registrationTypes';
import { Box } from '@/src/shared/components/Box';
import { formatFileSize } from '@/src/features/agency/model/registrationHelpers';

/**
 * 노출 콘텐츠(포스터·소개 이미지·안내사항·해시태그) 섹션입니다.
 */
export const PosterContentSection = ({
  images,
  activeRegistrationStep,
  exposureContentBlockRef,
  getRegistrationSectionHighlightClass,
  introImageCountLabel,
  introImageInputRef,
  noticeText,
  openIntroImagePicker,
  openPosterImagePicker,
  posterBlockRef,
  posterImageInputRef,
  registrationFieldErrorTarget,
  setNoticeText,
}: {
  images: ReturnType<typeof useRegistrationImages>;
  activeRegistrationStep: number;
  exposureContentBlockRef: RefObject<HTMLDivElement | null>;
  getRegistrationSectionHighlightClass: (target: RegistrationErrorTarget) => string;
  introImageCountLabel: string;
  introImageInputRef: RefObject<HTMLInputElement | null>;
  noticeText: string;
  openIntroImagePicker: () => void;
  openPosterImagePicker: () => void;
  posterBlockRef: RefObject<HTMLDivElement | null>;
  posterImageInputRef: RefObject<HTMLInputElement | null>;
  registrationFieldErrorTarget: RegistrationErrorTarget | null;
  setNoticeText: Dispatch<SetStateAction<string>>;
}) => (
  <div
    ref={exposureContentBlockRef}
    className={`rounded-[20px] ${getRegistrationSectionHighlightClass('poster')}`}
    style={{
      display: activeRegistrationStep === 0 ? undefined : 'none',
      order: activeRegistrationStep === 0 ? 2 : undefined,
    }}
  >
    <Box
      variant="shadow"
      className="space-y-5"
    >
    <div>
      <h2 className="text-[18px] font-black text-slate-950">노출 콘텐츠</h2>
    </div>

    <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
      <div
        ref={posterBlockRef}
        className="flex flex-col gap-2 rounded-3xl"
      >
        <span className="text-sm font-bold text-content-tertiary">공연 포스터</span>
        <input
          ref={posterImageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={images.handlePosterImageInputChange}
        />
        <div
          role="button"
          tabIndex={0}
          onClick={openPosterImagePicker}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              openPosterImagePicker();
            }
          }}
          onDragEnter={images.handlePosterImageDragEnter}
          onDragOver={images.handlePosterImageDragOver}
          onDragLeave={images.handlePosterImageDragLeave}
          onDrop={images.handlePosterImageDrop}
          className={`rounded-3xl border border-dashed p-4 transition ${
            registrationFieldErrorTarget === 'poster'
              ? 'border-danger bg-danger-subtle'
              : images.isPosterImageDragActive
              ? 'border-primary bg-primary-subtle'
              : 'border-line-strong bg-surface-subtle hover:border-line-strong hover:bg-surface'
          }`}
        >
          {images.posterImage ? (
            <div className="space-y-4">
              <p className="text-xs font-bold text-content-muted">드래그 하거나 파일 선택</p>
              <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-surface-muted">
                <Image
                  src={images.posterImage.previewUrl}
                  alt="공연 포스터 미리보기"
                  fill
                  unoptimized
                  className="object-cover"
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-content-secondary">{images.posterImage.file.name}</p>
                  <p className="mt-1 text-xs font-medium text-content-muted">
                    {formatFileSize(images.posterImage.file.size)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    images.handlePosterImageRemove();
                  }}
                  className="rounded-full border border-line px-3 py-1.5 text-xs font-bold text-content-tertiary transition hover:border-line-strong hover:bg-surface-subtle hover:text-content-secondary"
                >
                  삭제
                </button>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[420px] flex-col justify-between gap-4">
              <div>
                <p className="text-base font-black text-slate-950">포스터 이미지 업로드</p>
                <p className="mt-2 text-sm font-bold text-content-muted">드래그 하거나 파일 선택</p>
              </div>
              <div className="inline-flex w-fit items-center justify-center rounded-full bg-slate-950 px-4 py-2 text-sm font-bold text-white">
                포스터 선택
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-5">
        <div className="flex flex-col gap-2">
          <span className="text-sm font-bold text-content-tertiary">공연 소개</span>
          <input
            ref={introImageInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={images.handleIntroImageInputChange}
          />
          <div
            role="button"
            tabIndex={0}
            onClick={openIntroImagePicker}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                openIntroImagePicker();
              }
            }}
          onDragEnter={images.handleIntroImageDragEnter}
          onDragOver={images.handleIntroImageDragOver}
          onDragLeave={images.handleIntroImageDragLeave}
          onDrop={images.handleIntroImageDrop}
            className={`min-h-[220px] max-h-[460px] overflow-hidden rounded-3xl border border-dashed p-4 transition sm:p-5 ${
              images.isIntroImageDragActive
                ? 'border-primary bg-primary-subtle'
                : 'border-line-strong bg-surface-subtle hover:border-line-strong hover:bg-surface'
            }`}
          >
            <div className="flex h-full flex-col gap-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-base font-black text-slate-950">소개 이미지 업로드</p>
                  <p className="mt-2 text-sm font-bold text-content-muted">드래그 하거나 파일 선택</p>
                </div>
                <div className="inline-flex shrink-0 items-center justify-center rounded-full bg-slate-950 px-3 py-1.5 text-xs font-bold text-white sm:px-4 sm:py-2 sm:text-sm">
                  이미지 선택
                </div>
              </div>

              {images.introImages.length > 0 ? (
                <div className="max-h-[330px] overflow-y-auto pr-1">
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {images.introImages.map((image, index) => (
                      <div
                        key={image.id}
                        className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_12px_28px_rgba(15,23,42,0.05)]"
                      >
                        <div className="relative aspect-[4/3] bg-surface-muted">
                          <Image
                            src={image.previewUrl}
                            alt={`공연 소개 이미지 ${index + 1}`}
                            fill
                            unoptimized
                            className="object-cover"
                          />
                        </div>
                        <div className="flex items-center justify-between gap-2 px-3 py-2">
                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold text-content-secondary">{image.file.name}</p>
                            <p className="mt-0.5 text-[11px] font-medium text-content-muted">{formatFileSize(image.file.size)}</p>
                          </div>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              images.handleIntroImageRemove(image.id);
                            }}
                            className="shrink-0 rounded-full border border-line px-2.5 py-1 text-[11px] font-bold text-content-tertiary transition hover:border-line-strong hover:bg-surface-subtle hover:text-content-secondary"
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mt-auto flex flex-wrap items-center gap-3 text-xs font-bold text-content-muted">
                  <span>{introImageCountLabel}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-bold text-content-tertiary">공지사항</span>
          <textarea
            value={noticeText}
            onChange={(event) => setNoticeText(event.target.value)}
            placeholder="공지사항 입력"
            className="min-h-[180px] rounded-3xl border border-line bg-white px-4 py-4 text-sm font-medium leading-6 text-content-secondary outline-none transition focus:border-primary focus:ring-4 focus:ring-primary-light"
          />
        </label>

      </div>
    </div>
    </Box>
  </div>

);
