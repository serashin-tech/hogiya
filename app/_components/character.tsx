import Image from "next/image";

const SRC = {
  teacher: { src: "/characters/teacher.png", width: 364, height: 480 },
  student: { src: "/characters/student.png", width: 316, height: 480 },
} as const;

/** 역할마다 다른 캐릭터를 보여 준다. 장식이라서 대체 문구는 비운다. */
export function Character({ role, className = "h-24 w-auto" }: { role: "teacher" | "student"; className?: string }) {
  const c = SRC[role];
  return <Image src={c.src} width={c.width} height={c.height} alt="" aria-hidden className={`shrink-0 ${className}`} />;
}
