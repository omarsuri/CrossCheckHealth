"use client";

import React, { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Disclaimer } from "@/components/ui/Disclaimer";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { supabase } from "@/lib/supabase";
import { AddParentForm } from "./AddParentForm";

// Temporary development bypass: keep login required, but allow testing parent profile
// creation, invite links, and completed-result viewing before payments are enabled.
const DEV_UNLOCK_PARENT_FEATURES = true;

type ParentProfile = {
  id: string;
  name: string;
  relation: string;
  age?: number | null;
  gender?: string | null;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  status?: string | null;
  latest_result?: string | null;
  last_assessment?: string | null;
  latest_assessment_id?: string | null;
  consent?: boolean | null;
};

const formatParentDate = (date?: string | null) => {
  if (!date) return "No assessment yet";
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(date));
};

const formatParentStatus = (status?: string | null) => {
  if (!status) return "No status";
  return status.charAt(0).toUpperCase() + status.slice(1);
};

const parentStatusColor = (status?: string | null) => {
  if (status === "completed") return "green";
  if (status === "pending") return "amber";
  return "gray";
};

export const ParentProfilesPage = ({ navigate, user }) => {
  const [sessionUserId, setSessionUserId] = useState("");
  const [parents, setParents] = useState<ParentProfile[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [loadingParents, setLoadingParents] = useState(true);
  const [parentsError, setParentsError] = useState("");
  const [invitingParentId, setInvitingParentId] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const [fullInviteUrl, setFullInviteUrl] = useState("");
  const [inviteLinkParentName, setInviteLinkParentName] = useState("");
  const [copyStatus, setCopyStatus] = useState("");

  useEffect(() => {
    let active = true;

    const loadParents = async () => {
      setLoadingParents(true);
      setParentsError("");

      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        const currentUser = sessionData.session?.user;

        if (!currentUser) {
          if (active) {
            setSessionUserId("");
            setParents([]);
          }
          return;
        }

        if (active) setSessionUserId(currentUser.id);

        const response = await fetch(`/api/parents?user_id=${encodeURIComponent(currentUser.id)}`);
        const payload = await response.json().catch(() => null);

        if (!response.ok || payload?.success === false) {
          throw new Error(payload?.error?.message || "Unable to load parent profiles right now.");
        }

        if (active) setParents(Array.isArray(payload?.data) ? payload.data : []);
      } catch (error) {
        if (active) {
          setParents([]);
          setParentsError(error instanceof Error ? error.message : "Unable to load parent profiles right now.");
        }
      } finally {
        if (active) setLoadingParents(false);
      }
    };

    loadParents();

    return () => {
      active = false;
    };
  }, [user]);

  const createParentInvite = async (parent: ParentProfile) => {
    setInvitingParentId(parent.id);
    setInviteError("");
    setCopyStatus("");

    try {
      const response = await fetch("/api/parents/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parent_profile_id: parent.id,
          send_to_email: parent.email || undefined,
          send_to_phone: parent.phone || undefined,
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || payload?.success === false) {
        throw new Error(payload?.error?.message || "Unable to create invite link.");
      }

      const returnedInviteUrl = payload?.data?.invite_url;
      const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
      const builtFullInviteUrl = returnedInviteUrl?.startsWith("http")
        ? returnedInviteUrl
        : `${baseUrl}${returnedInviteUrl || ""}`;

      if (!returnedInviteUrl || !builtFullInviteUrl) {
        throw new Error("Invite was created, but no invite URL was returned.");
      }

      setInviteUrl(returnedInviteUrl);
      setFullInviteUrl(builtFullInviteUrl);
      setInviteLinkParentName(parent.name);
    } catch (error) {
      setInviteError(error instanceof Error ? error.message : "Unable to create invite link.");
    } finally {
      setInvitingParentId("");
    }
  };

  const copyInviteLink = async () => {
    setCopyStatus("");
    setInviteError("");

    try {
      if (!fullInviteUrl) return;
      await navigator.clipboard.writeText(fullInviteUrl);
      setCopyStatus("Copied!");
    } catch (error) {
      setInviteError("Could not copy automatically. The invite link is visible below so you can copy it manually.");
    }
  };

  const handlePlanUnlock = () => {
    if (DEV_UNLOCK_PARENT_FEATURES) {
      setShowAdd(true);
      return;
    }

    alert("Payment required to unlock Parivar Health profiles");
  };

  const handleProfileUnlock = (parent: ParentProfile) => {
    if (DEV_UNLOCK_PARENT_FEATURES) {
      if (parent.status === "completed" && parent.latest_assessment_id) {
        navigate("/results/" + parent.latest_assessment_id);
        return;
      }

      createParentInvite(parent);
      return;
    }

    alert("Payment required to unlock this profile");
  };

  if (!user || (!loadingParents && !sessionUserId)) {
    return (
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-16 text-center slide-up">
        <Icon name="lock" size={32} className="text-teal-deep mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-charcoal mb-3">Login Required</h2>
        <p className="text-gray-500 mb-6">Login to choose a Parivar Health plan and unlock parent or family profiles.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 slide-up">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-charcoal">Parent Profiles</h1>
          <p className="text-gray-500">Choose a Parivar Health plan to unlock profiles, checks, and family wellbeing updates.</p>
        </div>
        <Button variant="primary" icon="plus" onClick={() => setShowAdd(true)}>Add Parent</Button>
      </div>

      <Disclaimer type="consent" />
      {inviteError && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2 mb-6">{inviteError}</p>}
      {fullInviteUrl && (
        <Card className="mb-6">
          <h3 className="font-semibold text-charcoal mb-2">Invite link{inviteLinkParentName ? ` for ${inviteLinkParentName}` : ""}</h3>
          <p className="text-sm text-gray-500 mb-3">Share this link with your parent so they can complete the assessment.</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <input readOnly value={fullInviteUrl}
              className="flex-1 px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-700 outline-none" />
            <Button variant="outline" icon="copy" onClick={copyInviteLink}>Copy</Button>
          </div>
          {process.env.NODE_ENV === "development" && inviteUrl && <p className="text-xs text-gray-400 mt-2">Relative path: {inviteUrl}</p>}
          {copyStatus && <p className="text-sm text-green-700 mt-2">{copyStatus}</p>}
        </Card>
      )}

      <div className="grid md:grid-cols-3 gap-4 mb-8">
        {[
          { title: "Parent Profile", price: "Rs 199/mo", desc: "Unlock one parent profile.", button: "Pay to Unlock" },
          { title: "Family Profile", price: "Rs 299/mo", desc: "Unlock parents + person.", button: "Pay to Unlock" },
          { title: "Full Family", price: "Rs 499/mo", desc: "Unlock full family profiles.", button: "Pay to Unlock" },
        ].map(plan => (
          <Card key={plan.title} className="text-center">
            <Badge color={plan.title === "Full Family" ? "teal" : plan.title === "Family Profile" ? "amber" : "gray"}>{plan.title}</Badge>
            <h3 className="text-2xl font-bold text-charcoal mt-3 mb-1">{plan.price}</h3>
            <p className="text-sm text-gray-500 mb-5">{plan.desc}</p>
            <Button variant={plan.title === "Full Family" ? "primary" : "outline"} fullWidth icon="lock" onClick={handlePlanUnlock}>{plan.button}</Button>
          </Card>
        ))}
      </div>

      {loadingParents ? (
        <Card className="text-center py-12">
          <Icon name="users" size={32} className="text-gray-300 mx-auto mb-3" />
          <h3 className="font-semibold text-charcoal mb-2">Loading parent profiles</h3>
          <p className="text-sm text-gray-500">Fetching your saved family profiles.</p>
        </Card>
      ) : parentsError ? (
        <Card className="text-center py-12">
          <Icon name="alertTriangle" size={32} className="text-amber-500 mx-auto mb-3" />
          <h3 className="font-semibold text-charcoal mb-2">Could not load parent profiles</h3>
          <p className="text-sm text-gray-500 mb-4">{parentsError}</p>
          <Button variant="outline" onClick={() => window.location.reload()}>Try Again</Button>
        </Card>
      ) : parents.length === 0 ? (
        <Card className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon name="users" size={28} className="text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-charcoal mb-2">No parent profiles yet</h3>
          <p className="text-gray-500 mb-6 max-w-sm mx-auto">Add profiles and create health check invite links for family wellbeing updates.</p>
          <Button variant="primary" icon="plus" onClick={() => setShowAdd(true)}>Add Parent Profile</Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {parents.map(parent => (
            <Card key={parent.id}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-teal-soft rounded-full flex items-center justify-center">
                    <Icon name="user" size={24} className="text-teal-deep" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-charcoal text-lg">{parent.name} <span className="text-sm font-normal text-gray-400">({parent.relation})</span></h3>
                    <p className="text-sm text-gray-500">Age {parent.age || "-"} - {parent.location || "Location not set"}</p>
                    <div className="flex items-center gap-3 mt-1 text-sm">
                      <span className="text-gray-400">Last checked: <span className="text-charcoal">{formatParentDate(parent.last_assessment)}</span></span>
                      <span className="text-gray-400">Result: <span className="text-charcoal">{parent.latest_result || "No result yet"}</span></span>
                      <span className="text-gray-400">Consent: <span className="text-charcoal">{parent.consent ? "Yes" : "No"}</span></span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge color={parentStatusColor(parent.status)}>{formatParentStatus(parent.status)}</Badge>
                  <Button variant="amber" size="sm" icon="lock" onClick={() => handleProfileUnlock(parent)}>Unlock</Button>
                  <Button variant="ghost" size="sm" icon="send" disabled={invitingParentId === parent.id} onClick={() => createParentInvite(parent)}>{invitingParentId === parent.id ? "Creating..." : "Remind"}</Button>
                  {parent.status === "completed" && parent.latest_assessment_id ? (
                    <Button variant="outline" size="sm" onClick={() => navigate("/results/" + parent.latest_assessment_id)}>View Result</Button>
                  ) : parent.status === "completed" ? (
                    <Button variant="outline" size="sm" disabled>Result is still processing</Button>
                  ) : null}
                  <Button variant="outline" size="sm" onClick={() => navigate("/dashboard/parents/history/" + parent.id)}>History</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Parent Profile" size="md">
        <AddParentForm
          onClose={() => setShowAdd(false)}
          onAdd={(newParent) => {
            setParents((current) => [newParent as ParentProfile, ...current]);
          }}
        />
      </Modal>
    </div>
  );
};
