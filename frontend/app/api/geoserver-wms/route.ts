import { NextRequest, NextResponse } from "next/server";
import { PNG } from "pngjs";

const GEOSERVER_WMS_URL = process.env.GEOSERVER_WMS_URL;
const BLACK_EDGE_THRESHOLD = 35;

function isBlackPixel(data: Buffer, pixelIndex: number): boolean {
  const offset = pixelIndex * 4;
  return (
    data[offset] <= BLACK_EDGE_THRESHOLD &&
    data[offset + 1] <= BLACK_EDGE_THRESHOLD &&
    data[offset + 2] <= BLACK_EDGE_THRESHOLD &&
    data[offset + 3] > 0
  );
}

function makeTransparent(data: Buffer, pixelIndex: number) {
  data[pixelIndex * 4 + 3] = 0;
}

function removeConnectedBlackEdge(imageBuffer: Buffer): Buffer {
  const png = PNG.sync.read(imageBuffer);
  const { width, height, data } = png;
  const visited = new Uint8Array(width * height);
  const queue: number[] = [];

  const enqueue = (x: number, y: number) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const pixelIndex = y * width + x;
    if (visited[pixelIndex] || !isBlackPixel(data, pixelIndex)) return;
    visited[pixelIndex] = 1;
    queue.push(pixelIndex);
  };

  for (let x = 0; x < width; x += 1) {
    enqueue(x, 0);
    enqueue(x, height - 1);
  }

  for (let y = 0; y < height; y += 1) {
    enqueue(0, y);
    enqueue(width - 1, y);
  }

  for (let i = 0; i < queue.length; i += 1) {
    const pixelIndex = queue[i];
    makeTransparent(data, pixelIndex);

    const x = pixelIndex % width;
    const y = Math.floor(pixelIndex / width);
    enqueue(x + 1, y);
    enqueue(x - 1, y);
    enqueue(x, y + 1);
    enqueue(x, y - 1);
  }

  return PNG.sync.write(png);
}

export async function GET(request: NextRequest) {
  if (!GEOSERVER_WMS_URL) {
    return NextResponse.json(
      { success: false, error: "GEOSERVER_WMS_URL is not configured" },
      { status: 503 },
    );
  }

  const upstreamUrl = new URL(GEOSERVER_WMS_URL);

  for (const [key, value] of request.nextUrl.searchParams.entries()) {
    upstreamUrl.searchParams.set(key, value);
  }

  upstreamUrl.searchParams.set("transparent", "true");
  upstreamUrl.searchParams.set("format", "image/png");
  upstreamUrl.searchParams.set("bgcolor", "0xFFFFFF");

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      cache: "no-store",
    });

    const contentType =
      upstreamResponse.headers.get("content-type") || "application/octet-stream";
    const body = await upstreamResponse.arrayBuffer();
    const bodyBuffer = Buffer.from(body);
    const responseBody = contentType.includes("image/png")
      ? removeConnectedBlackEdge(bodyBuffer)
      : bodyBuffer;
    const responseBytes = new Uint8Array(responseBody);

    return new NextResponse(responseBytes, {
      status: upstreamResponse.status,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("geoserver-wms proxy error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch GeoServer WMS" },
      { status: 502 }
    );
  }
}