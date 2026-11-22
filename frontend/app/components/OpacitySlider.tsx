"use client";

type Props = {
  label?: string;
  value: number; // 0 ~ 1
  onChange: (value: number) => void;
  disabled?: boolean;
};

export default function OpacitySlider({
  label = "透明度",
  value,
  onChange,
  disabled = false,
}: Props) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <span style={{ fontSize: 12, color: "var(--color-blue)", minWidth: 44 }}>{label}</span>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ flex: 1, minWidth: 0, cursor: disabled ? "not-allowed" : "pointer" }}
      />
      <span style={{ fontSize: 11, color: "var(--color-umber)", minWidth: 28, textAlign: "right" }}>
        {Math.round(value * 100)}%
      </span>
    </div>
  );
}