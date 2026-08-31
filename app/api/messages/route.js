import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_MEDIA_BYTES = 1.5 * 1024 * 1024;

export async function GET(req) {
  const room = req.nextUrl.searchParams.get("room");
  if (!room) {
    return NextResponse.json({ error: "room wajib diisi" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const cutoff = new Date(Date.now() - DAY_MS).toISOString();

  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("room_code", room)
    .gt("created_at", cutoff)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ messages: data });
}

export async function POST(req) {
  const body = await req.json();
  const { room, sender, text, mediaDataUrl, mediaType } = body || {};

  if (!room || !sender) {
    return NextResponse.json({ error: "room dan sender wajib diisi" }, { status: 400 });
  }
  if (!text?.trim() && !mediaDataUrl) {
    return NextResponse.json({ error: "pesan kosong" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  await supabase.from("rooms").upsert({ code: room }, { onConflict: "code" });

  let media_url = null;
  if (mediaDataUrl) {
    const match = /^data:(.+);base64,(.+)$/.exec(mediaDataUrl);
    if (!match) {
      return NextResponse.json({ error: "format media tidak valid" }, { status: 400 });
    }
    const [, mime, base64] = match;
    const buffer = Buffer.from(base64, "base64");
    if (buffer.length > MAX_MEDIA_BYTES) {
      return NextResponse.json({ error: "file terlalu besar (maks 1.5MB di tier gratis)" }, { status: 400 });
    }
    const ext = (mime.split("/")[1] || "bin").replace(/[^a-z0-9]/gi, "");
    const path = `${room}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("media")
      .upload(path, buffer, { contentType: mime });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }
    const { data: publicUrl } = supabase.storage.from("media").getPublicUrl(path);
    media_url = publicUrl.publicUrl;
  }

  const { data, error } = await supabase
    .from("messages")
    .insert({
      room_code: room,
      sender,
      body: text?.trim() || null,
      media_url,
      media_type: mediaType || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ message: data });
          }
