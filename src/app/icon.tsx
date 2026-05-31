import { ImageResponse } from "next/og";

export const runtime = "edge";
export const contentType = "image/png";
export const size = {
  width: 256,
  height: 256,
};

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background:
            "linear-gradient(135deg, rgb(54, 191, 165) 0%, rgb(29, 122, 145) 100%)",
          display: "flex",
          height: "100%",
          justifyContent: "center",
          width: "100%",
        }}
      >
        <div
          style={{
            background: "rgba(255,255,255,0.16)",
            border: "8px solid rgba(255,255,255,0.2)",
            borderRadius: "56px",
            color: "white",
            display: "flex",
            fontFamily: "sans-serif",
            fontSize: 104,
            fontWeight: 800,
            height: 180,
            justifyContent: "center",
            letterSpacing: "-0.06em",
            lineHeight: 1,
            width: 180,
          }}
        >
          KYC
        </div>
      </div>
    ),
    size
  );
}
