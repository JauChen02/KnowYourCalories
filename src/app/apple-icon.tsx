import { ImageResponse } from "next/og";

export const runtime = "edge";
export const contentType = "image/png";
export const size = {
  width: 180,
  height: 180,
};

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background:
            "linear-gradient(160deg, rgb(244, 250, 247) 0%, rgb(214, 242, 236) 100%)",
          borderRadius: 40,
          display: "flex",
          height: "100%",
          justifyContent: "center",
          width: "100%",
        }}
      >
        <div
          style={{
            alignItems: "center",
            background:
              "linear-gradient(135deg, rgb(54, 191, 165) 0%, rgb(29, 122, 145) 100%)",
            borderRadius: 36,
            color: "white",
            display: "flex",
            fontFamily: "sans-serif",
            fontSize: 72,
            fontWeight: 800,
            height: 132,
            justifyContent: "center",
            letterSpacing: "-0.06em",
            width: 132,
          }}
        >
          KYC
        </div>
      </div>
    ),
    size
  );
}
