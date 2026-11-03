import { useEffect, useState, type FormEvent } from "react";
import { getProfile, updateProfile } from "../../services/profileService";

export default function ProfileSettings() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        const profile = await getProfile();

        if (!cancelled) {
          setName(profile.name);
          setEmail(profile.email);
        }
      } catch {
        if (!cancelled) {
          setError("Could not load your profile.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const trimmedName = name.trim();

    if (!trimmedName || trimmedName.length > 80) {
      setError("Enter a name between 1 and 80 characters.");
      return;
    }

    try {
      setSaving(true);
      const updated = await updateProfile(trimmedName);
      setName(updated.name);
      setEmail(updated.email);
      setSuccess("Your profile has been updated.");
    } catch {
      setError("Could not save your changes. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-400">Loading profile...</p>;
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-xl space-y-5"
    >
      <div>
        <label
          htmlFor="profile-name"
          className="mb-2 block text-sm text-slate-300"
        >
          Full name
        </label>
        <input
          id="profile-name"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={80}
          required
          className="w-full rounded-lg border border-white/10 bg-[#060912] px-4 py-3 text-sm outline-none focus:border-[#c0c1ff]"
        />
      </div>

      <div>
        <label
          htmlFor="profile-email"
          className="mb-2 block text-sm text-slate-300"
        >
          Email address
        </label>
        <input
          id="profile-email"
          type="email"
          value={email}
          readOnly
          className="w-full cursor-not-allowed rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-400 outline-none"
        />
        <p className="mt-2 text-xs text-slate-500">
          Email changes are disabled for now.
        </p>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {success && <p className="text-sm text-emerald-400">{success}</p>}

      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-[#c0c1ff] px-5 py-2.5 text-sm font-medium text-[#060912] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save changes"}
      </button>
    </form>
  );
}
