/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Artist Page editor - band.link-style public bio/link page. Editing lives
 * inside the app (Creator Profile tab); the public page itself is served
 * at /a/<slug> without requiring login (see PublicArtistPage.tsx + the
 * routing check in main.tsx).
 */
import React, { useState, useEffect } from "react";
import { Link2, Plus, Trash2, Save, ExternalLink, Palette } from "lucide-react";
import { getMyArtistPage, saveMyArtistPage, SocialLink } from "../utils/api";

export const ArtistPageEditor: React.FC = () => {
  const [slug, setSlug] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [tagline, setTagline] = useState("");
  const [bio, setBio] = useState("");
  const [accentColor, setAccentColor] = useState("#c9a227");
  const [links, setLinks] = useState<SocialLink[]>([{ label: "Instagram", url: "" }]);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [hasPage, setHasPage] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const page = await getMyArtistPage();
        if (page) {
          setSlug(page.slug);
          setDisplayName(page.displayName);
          setTagline(page.tagline || "");
          setBio(page.bio || "");
          setAccentColor(page.accentColor || "#c9a227");
          setLinks(page.links?.length ? page.links : [{ label: "Instagram", url: "" }]);
          setHasPage(true);
        }
      } catch {
        // no page yet - fine, form stays blank
      }
    };
    load();
  }, []);

  const updateLink = (idx: number, field: "label" | "url", value: string) => {
    setLinks((prev) => prev.map((l, i) => (i === idx ? { ...l, [field]: value } : l)));
  };
  const addLink = () => setLinks((prev) => [...prev, { label: "", url: "" }]);
  const removeLink = (idx: number) => setLinks((prev) => prev.filter((_, i) => i !== idx));

  const handleSave = async () => {
    if (!slug.trim() || !displayName.trim()) {
      setStatus("Page URL and display name are required.");
      return;
    }
    setIsSaving(true);
    setStatus("");
    try {
      await saveMyArtistPage({
        slug: slug.trim().toLowerCase(),
        displayName: displayName.trim(),
        tagline,
        bio,
        accentColor,
        links: links.filter((l) => l.label.trim() && l.url.trim()),
      });
      setHasPage(true);
      setStatus("Saved.");
    } catch (e: any) {
      setStatus(e.message || "Save failed.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-brand-border pb-4">
        <div className="flex items-center gap-2.5 text-brand-gold">
          <Link2 className="h-5 w-5" />
          <div>
            <h2 className="font-display text-lg text-brand-ink">Artist Page</h2>
            <p className="text-[11px] text-brand-ink-muted">Your public bio/link page - crazyjam.app/a/{slug || "your-name"}</p>
          </div>
        </div>
        {hasPage && (
          <a href={`/a/${slug}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-[12px] text-brand-gold hover:underline">
            View page <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-medium text-brand-ink-muted">Page URL</label>
          <div className="flex items-center bg-brand-surface-2 border border-brand-border rounded-lg overflow-hidden">
            <span className="px-3 text-[12px] text-brand-ink-muted">/a/</span>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
              placeholder="your-artist-name"
              className="flex-1 bg-transparent text-brand-ink px-1 py-2 text-sm outline-none"
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-medium text-brand-ink-muted">Display Name</label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your artist name"
            className="bg-brand-surface-2 border border-brand-border focus:border-brand-gold/50 text-brand-ink px-3 py-2 text-sm rounded-lg outline-none"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-medium text-brand-ink-muted">Tagline</label>
        <input
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          placeholder="A one-line hook for your marketing"
          className="bg-brand-surface-2 border border-brand-border focus:border-brand-gold/50 text-brand-ink px-3 py-2 text-sm rounded-lg outline-none"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-medium text-brand-ink-muted">Bio</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={4}
          placeholder="Tell fans who you are..."
          className="bg-brand-surface-2 border border-brand-border focus:border-brand-gold/50 text-brand-ink px-3 py-2 text-sm rounded-lg outline-none resize-none"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-medium text-brand-ink-muted flex items-center gap-1.5">
          <Palette className="h-3 w-3" /> Accent color
        </label>
        <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="h-9 w-16 rounded-lg border border-brand-border bg-transparent cursor-pointer" />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[11px] font-medium text-brand-ink-muted">Links</label>
        {links.map((link, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <input
              value={link.label}
              onChange={(e) => updateLink(idx, "label", e.target.value)}
              placeholder="Label (Spotify, Instagram...)"
              className="w-40 bg-brand-surface-2 border border-brand-border text-brand-ink px-3 py-2 text-sm rounded-lg outline-none"
            />
            <input
              value={link.url}
              onChange={(e) => updateLink(idx, "url", e.target.value)}
              placeholder="https://..."
              className="flex-1 bg-brand-surface-2 border border-brand-border text-brand-ink px-3 py-2 text-sm rounded-lg outline-none"
            />
            <button onClick={() => removeLink(idx)} className="text-brand-ink-muted hover:text-red-400">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        <button onClick={addLink} className="flex items-center gap-1.5 text-[12px] text-brand-gold self-start">
          <Plus className="h-3.5 w-3.5" /> Add link
        </button>
      </div>

      <button
        onClick={handleSave}
        disabled={isSaving}
        className="w-full h-11 flex items-center justify-center gap-2 metal-gold rounded-xl font-semibold text-sm transition-all disabled:opacity-50 mt-2"
      >
        <Save className="h-4 w-4" /> {isSaving ? "Saving..." : "Save Artist Page"}
      </button>
      {status && <p className="text-[11px] text-brand-gold text-center">{status}</p>}
    </div>
  );
};
