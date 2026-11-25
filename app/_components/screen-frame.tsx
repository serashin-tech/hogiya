import type { ReactNode } from "react";

/**
 * 화면 틀. 위에는 제목 줄, 왼쪽 2/3는 보는 내용, 오른쪽 1/3은 하는 일이다.
 * 좁은 화면에서는 위아래로 쌓인다.
 */
export function ScreenFrame({
  title,
  status,
  main,
  side,
}: {
  title: ReactNode;
  status?: ReactNode;
  main: ReactNode;
  side: ReactNode;
}) {
  return (
    <div className="screen-frame">
      <div className="screen-bar">
        <span>{title}</span>
        {status && <span>{status}</span>}
      </div>
      <div className="screen-main">{main}</div>
      <div className="screen-side">{side}</div>
    </div>
  );
}
