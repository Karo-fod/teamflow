import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

// workspaceId -> number of components currently interested in its events.
const roomCounts = new Map<string, number>();

function emitJoin(workspaceId: string) {
  socket?.emit(
    "workspace:join",
    workspaceId,
    (result?: { success: boolean; message?: string }) => {
      if (result && !result.success) console.error(result.message);
    }
  );
}

export function connectSocket(token: string): Socket {
  if (socket) {
    socket.auth = { token };

    if (!socket.connected) {
      socket.connect();
    }

    return socket;
  }

  socket = io(import.meta.env.VITE_API_URL.replace(/\/api\/?$/, ""), {
    autoConnect: false,
    auth: { token },
  });

  // (Re)join every workspace room we care about whenever we (re)connect.
  socket.on("connect", () => {
    roomCounts.forEach((_count, workspaceId) => emitJoin(workspaceId));
  });

  socket.connect();

  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
  roomCounts.clear();
}

// Reference-counted room membership so several components can listen to the
// same workspace without one of them unsubscribing the others on unmount.
export function acquireWorkspaceRoom(
  workspaceId: string,
  token: string
): { socket: Socket; release: () => void } {
  const active = connectSocket(token);
  const count = roomCounts.get(workspaceId) ?? 0;

  roomCounts.set(workspaceId, count + 1);

  if (count === 0 && active.connected) emitJoin(workspaceId);

  let released = false;

  return {
    socket: active,
    release: () => {
      if (released) return;
      released = true;

      const remaining = (roomCounts.get(workspaceId) ?? 1) - 1;

      if (remaining <= 0) {
        roomCounts.delete(workspaceId);
        socket?.emit("workspace:leave", workspaceId);
      } else {
        roomCounts.set(workspaceId, remaining);
      }
    },
  };
}
