"use client";

import { useState } from "react";

export type SlideView = { id: string; title: string; text: string };

/** 슬라이드를 한 장씩 넘겨 보는 16:9 상자. 수업 자료와 호기의 설명이 같은 모양으로 보인다. */
export function SlideViewer({ slides, empty = "아직 올린 자료가 없어요." }: { slides: SlideView[]; empty?: string }) {
  const [at, setAt] = useState(0);
  if (slides.length === 0) {
    return <div className="screen-slide text-muted">{empty}</div>;
  }
  const index = Math.min(at, slides.length - 1); // 자료가 줄어도 범위를 벗어나지 않는다
  const slide = slides[index];
  return (
    <div>
      <div className="screen-slide" aria-live="polite">
        <strong className="text-lg">{slide.title}</strong>
        {slide.text !== slide.title && <p className="whitespace-pre-line text-sm">{slide.text}</p>}
      </div>
      <div className="mt-2 flex items-center justify-center gap-4 text-sm font-semibold text-muted">
        <button type="button" onClick={() => setAt(index - 1)} disabled={index === 0} aria-label="이전 슬라이드">
          ‹
        </button>
        <span>
          슬라이드 {index + 1} / {slides.length}
        </span>
        <button type="button" onClick={() => setAt(index + 1)} disabled={index === slides.length - 1} aria-label="다음 슬라이드">
          ›
        </button>
      </div>
    </div>
  );
}
