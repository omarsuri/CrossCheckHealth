"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { supabase } from "@/lib/supabase";

type AddParentFormProps = {
  onClose: () => void;
  onAdd: (parent: unknown) => void;
};

type SavedParent = {
  id: string;
};

export const AddParentForm = ({ onAdd }: AddParentFormProps) => {
  const [form, setForm] = useState({ name: "", relation: "Mother", age: "", gender: "Female", email: "", phone: "", location: "", notes: "", consent: false });
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedParent, setSavedParent] = useState<SavedParent | null>(null);
  const [inviteLink, setInviteLink] = useState("");
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      const sessionUser = sessionData.session?.user;
      if (!sessionUser) {
        throw new Error("Please log in to create a parent profile.");
      }

      const response = await fetch("/api/parents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner_user_id: sessionUser.id,
          name: form.name,
          relation: form.relation,
          age: form.age ? Number(form.age) : undefined,
          gender: form.gender,
          email: form.email,
          phone: form.phone,
          location: form.location,
          notes: form.notes,
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || payload?.success === false) {
        throw new Error(payload?.error?.message || "Unable to create parent profile.");
      }

      onAdd(payload.data);
      setSavedParent(payload.data);
      setSubmitted(true);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to create parent profile.");
    } finally {
      setSaving(false);
    }
  };

  const createAndCopyInviteLink = async () => {
    setCreatingInvite(true);
    setError("");
    setCopyStatus("");

    try {
      if (!savedParent?.id) {
        throw new Error("Parent profile was saved, but its id is missing.");
      }

      const response = await fetch("/api/parents/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parent_profile_id: savedParent.id,
          send_to_email: form.email || undefined,
          send_to_phone: form.phone || undefined,
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || payload?.success === false) {
        throw new Error(payload?.error?.message || "Unable to create invite link.");
      }

      const returnedInviteUrl = payload?.data?.invite_url;
      const fullInviteUrl = returnedInviteUrl ? window.location.origin + returnedInviteUrl : "";

      if (!fullInviteUrl) {
        throw new Error("Invite was created, but no invite URL was returned.");
      }

      setInviteLink(fullInviteUrl);
      await navigator.clipboard.writeText(fullInviteUrl);
      setCopyStatus("Copied!");
    } catch (copyError) {
      setError(
        copyError instanceof Error && copyError.message.includes("clipboard")
          ? "Could not copy automatically. The invite link is visible below so you can copy it manually."
          : copyError instanceof Error
            ? copyError.message
            : "Could not create or copy invite link."
      );
    } finally {
      setCreatingInvite(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Icon name="check" size={28} className="text-green-600" />
        </div>
        <h3 className="text-xl font-bold text-charcoal mb-2">Parent profile created!</h3>
        <p className="text-gray-500 mb-6">You can now send an assessment invite to {form.name}.</p>
        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2 mb-4">{error}</p>}
        {inviteLink && (
          <div className="mb-4 text-left">
            <label className="block text-sm font-medium text-gray-700 mb-1">Invite link</label>
            <input readOnly value={inviteLink}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-700 outline-none" />
            {copyStatus && <p className="text-sm text-green-700 mt-2">{copyStatus}</p>}
          </div>
        )}
        <div className="flex gap-3">
          <Button variant="outline" size="sm" icon="copy" disabled={creatingInvite} onClick={createAndCopyInviteLink}>{creatingInvite ? "Creating..." : "Copy Invite Link"}</Button>
          <Button variant="primary" size="sm" icon="send" onClick={() => alert(`Email invite sent to ${form.email}`)}>Send Email</Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Parent's name</label>
        <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-teal-deep focus:ring-2 focus:ring-teal-500/20 outline-none" placeholder="Full name" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Relation</label>
          <select value={form.relation} onChange={e => setForm({ ...form, relation: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-teal-deep focus:ring-2 focus:ring-teal-500/20 outline-none">
            {["Mother", "Father", "Grandparent", "Guardian", "Other"].map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
          <input type="number" required value={form.age} onChange={e => setForm({ ...form, age: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-teal-deep focus:ring-2 focus:ring-teal-500/20 outline-none" placeholder="Age" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
          <select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-teal-deep focus:ring-2 focus:ring-teal-500/20 outline-none">
            {["Female", "Male", "Other"].map(g => <option key={g}>{g}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
          <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-teal-deep focus:ring-2 focus:ring-teal-500/20 outline-none" placeholder="City, Country" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-teal-deep focus:ring-2 focus:ring-teal-500/20 outline-none" placeholder="parent@example.com" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Phone number</label>
        <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-teal-deep focus:ring-2 focus:ring-teal-500/20 outline-none" placeholder="+1 234 567 890" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Health notes (optional)</label>
        <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-teal-deep focus:ring-2 focus:ring-teal-500/20 outline-none" rows={3} placeholder="Any known conditions or medications..." />
      </div>
      <label className="flex items-start gap-2 cursor-pointer">
        <input type="checkbox" required checked={form.consent} onChange={e => setForm({ ...form, consent: e.target.checked })} className="mt-1" />
        <span className="text-sm text-gray-600">I confirm I have permission to create this profile and send health awareness assessments.</span>
      </label>
      <Button variant="primary" fullWidth type="submit" disabled={saving}>{saving ? "Creating..." : "Create Parent Profile"}</Button>
    </form>
  );
};
