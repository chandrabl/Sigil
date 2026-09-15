import type { ReactNode } from "react";

export function StatusBanner({
  tone,
  children,
}: {
  tone: "error" | "info";
  children: ReactNode;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={[
        "rounded-sm border px-4 py-3 text-sm",
        tone === "error"
          ? "border-seal-500/40 bg-seal-500/10 text-parchment-100"
          : "border-brass-500/30 bg-brass-500/10 text-parchment-100",
      ].join(" ")}
    >
      {children}
    </div>
  );
}
