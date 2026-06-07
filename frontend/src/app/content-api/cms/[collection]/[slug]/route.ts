import { NextRequest, NextResponse } from "next/server";
import { getDocBySlug } from "@/lib/cms";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ collection: string; slug: string }> }
) {
  const { collection, slug } = await params;
  try {
    const doc = await getDocBySlug(collection, slug);

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    return NextResponse.json(doc);
  } catch {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }
}
