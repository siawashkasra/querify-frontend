export default function OgImageElement() {
  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #1d4ed8 0%, #2563eb 45%, #3b82f6 100%)",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 24,
          padding: 48,
        }}
      >
        <div style={{ fontSize: 72, fontWeight: 800, letterSpacing: "0.08em", color: "#ffffff", textTransform: "uppercase" }}>QUERIFY</div>
        <div style={{ fontSize: 36, fontWeight: 600, color: "rgba(255,255,255,0.95)", textAlign: "center", maxWidth: 900, lineHeight: 1.25 }}>Ask your database anything</div>
      </div>
    </div>
  )
}
