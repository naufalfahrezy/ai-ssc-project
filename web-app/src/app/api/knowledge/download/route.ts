import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get("id");

    if (!documentId) {
      return NextResponse.json(
        { error: "Document ID wajib dikirim." },
        { status: 400 }
      );
    }

    const { data: document, error: documentError } = await supabaseAdmin
      .from("documents")
      .select("id, original_file_name, storage_bucket, storage_path, is_active")
      .eq("id", documentId)
      .single();

    if (documentError || !document) {
      return NextResponse.json(
        { error: "Dokumen tidak ditemukan." },
        { status: 404 }
      );
    }

    if (!document.is_active) {
      return NextResponse.json(
        { error: "Dokumen sedang tidak aktif." },
        { status: 403 }
      );
    }

    const { data: signedData, error: signedError } =
      await supabaseAdmin.storage
        .from(document.storage_bucket || "ssc_documents")
        .createSignedUrl(document.storage_path, 60 * 10, {
          download: document.original_file_name,
        });

    if (signedError || !signedData?.signedUrl) {
      return NextResponse.json(
        { error: "Gagal membuat link unduhan." },
        { status: 500 }
      );
    }

    return NextResponse.redirect(signedData.signedUrl);
  } catch (error) {
    console.error("Download document error:", error);

    return NextResponse.json(
      { error: "Terjadi kesalahan saat memproses unduhan." },
      { status: 500 }
    );
  }
}