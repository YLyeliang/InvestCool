import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/cms";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ collection: string }> }
) {
  const { collection } = await params;
  try {
    const items = await getCollection(collection);
    return NextResponse.json(items);
  } catch {
    return NextResponse.json({ error: "Collection not found" }, { status: 404 });
  }
}
