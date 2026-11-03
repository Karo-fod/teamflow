import Workspace from "./workspace.model.js";
import WorkspaceMember from "./workspaceMember.model.js";

function createSlug(name) {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);

  const suffix = Math.random().toString(36).slice(2, 8);

  return `${base || "workspace"}-${suffix}`;
}

// Creates a workspace and makes `user` its owner. Retries on the (very
// unlikely) event of a slug collision and rolls back if the membership fails.
export async function createWorkspaceForUser(user, name) {
  let workspace;

  for (let attempt = 0; attempt < 3 && !workspace; attempt += 1) {
    try {
      workspace = await Workspace.create({
        name,
        slug: createSlug(name),
        createdBy: user._id,
      });
    } catch (error) {
      if (error?.code !== 11000 || attempt === 2) throw error;
    }
  }

  try {
    await WorkspaceMember.create({
      workspaceId: workspace._id,
      userId: user._id,
      role: "owner",
    });

    return workspace;
  } catch (error) {
    try {
      await Workspace.deleteOne({ _id: workspace._id });
    } catch (cleanupError) {
      // Preserve the original membership-creation error.
      console.error(
        "Failed to clean up workspace after membership creation failed:",
        cleanupError
      );
    }

    throw error;
  }
}

export function createDefaultWorkspace(user) {
  return createWorkspaceForUser(user, `${user.name}'s Workspace`.slice(0, 80));
}
