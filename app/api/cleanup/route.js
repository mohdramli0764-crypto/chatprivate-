import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const DAY_MS = 24 * 60 * 60 * 1000;

export async function GET(req) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const cutoff = new Date(Date.now() - DAY_MS).toISOString();

  const { data: expired, error: selectError } = await supabase
    .from("messages")
    .select("id, media_url")
    .lt("created_at", cutoff);

  if (selectError) {
    return NextResponse.json({ error: selectError.message }, { status: 500 });
  }

  const paths = (expired || [])
    .filter((m) => m.media_url)
    .map((m) => m.media_url.split("/media/")[1])
    .filter(Boolean);

  if (paths.length > 0) {
    await supabase.storage.from("media").remove(paths);
  }

  const { error: deleteError } = await supabase
    .from("messages")
    .delete()
    .lt("created_at", cutoff);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: expired?.length || 0 });
            }
