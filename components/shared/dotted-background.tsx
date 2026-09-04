export function DottedBackground() {
  return (
    <div
      className="pointer-events-none absolute inset-0 -z-10"
      style={{
        backgroundImage: "radial-gradient(circle, rgb(148 163 184 / 0.15) 1px, transparent 1px)",
        backgroundSize: "22px 22px",
      }}
    />
  );
}
