'use client';

import { useState } from 'react';
import { Badge } from '@/src/shared/components/Badge';
import { Button } from '@/src/shared/components/Button';
import {
  maxPerformanceHashtagCount,
  normalizeHashtag,
} from '@/src/features/agency/model/registrationHelpers';

/**
 * 공연 해시태그 입력 섹션입니다.
 *
 * <p>입력값 정리(앞의 # 제거·공백 정리)와 중복·개수 제한이 모두 이 안에서
 * 끝나므로 상태를 밖으로 내보내지 않습니다. 등록 시점에 필요한 목록만
 * onChange로 알려 줍니다.</p>
 *
 * @param hashtags 현재 해시태그 목록
 * @param onChange 목록이 바뀔 때
 */
export const HashtagSection = ({
  hashtags,
  onChange,
}: {
  hashtags: string[];
  onChange: (next: string[]) => void;
}) => {
  const [hashtagInputValue, setHashtagInputValue] = useState('');

  const performanceHashtags = hashtags;
  const setPerformanceHashtags = (
    updater: string[] | ((current: string[]) => string[]),
  ) => onChange(typeof updater === 'function' ? updater(hashtags) : updater);

  const normalizedHashtagInput = normalizeHashtag(hashtagInputValue);
  const formattedHashtagInput = normalizedHashtagInput ? `#${normalizedHashtagInput}` : '';
  const canAddHashtag =
    formattedHashtagInput.length > 1 &&
    performanceHashtags.length < maxPerformanceHashtagCount &&
    !performanceHashtags.includes(formattedHashtagInput);

  const handleHashtagAdd = (rawValue = hashtagInputValue) => {
    const normalizedValue = normalizeHashtag(rawValue);

    if (!normalizedValue || performanceHashtags.length >= maxPerformanceHashtagCount) {
      return;
    }

    const nextHashtag = `#${normalizedValue}`;

    if (performanceHashtags.includes(nextHashtag)) {
      setHashtagInputValue('');
      return;
    }

    setPerformanceHashtags((current) => [...current, nextHashtag]);
    setHashtagInputValue('');
  };

  const handleHashtagRemove = (targetHashtag: string) => {
    setPerformanceHashtags((current) => current.filter((hashtag) => hashtag !== targetHashtag));
  };

  return (
    <div className="flex min-h-[268px] flex-col rounded-3xl border border-line bg-surface p-5 shadow-[0_16px_40px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-bold text-content-tertiary">해시태그</span>
        <Badge color="blue" variant="outline">
          {performanceHashtags.length}/{maxPerformanceHashtagCount}
        </Badge>
      </div>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex min-w-0 flex-1 flex-col gap-2">
          <span className="text-xs font-bold tracking-[0.08em] text-content-muted">키워드 입력</span>
          <div className="flex items-center gap-2 rounded-2xl border border-line bg-surface-subtle px-4 py-3 transition focus-within:border-primary focus-within:ring-4 focus-within:ring-primary-light">
            <span className="text-sm font-black text-primary">#</span>
            <input
              type="text"
              value={hashtagInputValue}
              onChange={(event) => setHashtagInputValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  handleHashtagAdd();
                }
              }}
              placeholder="초연, OST, 한정공연"
              disabled={performanceHashtags.length >= maxPerformanceHashtagCount}
              className="w-full bg-transparent text-sm font-semibold text-content outline-none placeholder:text-content-muted disabled:cursor-not-allowed"
            />
          </div>
        </label>

        <Button
          color="primary"
          size="medium"
          disabled={!canAddHashtag}
          onClick={() => handleHashtagAdd()}
        >
          추가
        </Button>
          </div>

          {performanceHashtags.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
          {performanceHashtags.map((hashtag) => (
            <button
              key={hashtag}
              type="button"
              onClick={() => handleHashtagRemove(hashtag)}
              className="inline-flex items-center gap-2 rounded-full border border-primary-light bg-primary-subtle px-3 py-2 text-sm font-black text-primary-hover transition hover:border-primary-light hover:bg-primary-light"
            >
              <span>{hashtag}</span>
              <span className="text-xs text-primary">삭제</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
};
