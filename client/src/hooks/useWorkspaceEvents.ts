import { useEffect, useRef } from "react";
import { acquireWorkspaceRoom } from "../services/socket";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Handler = (payload: any) => void;

// Subscribes to live events (e.g. "task:created") for a workspace. Handlers
// can change on every render without re-subscribing.
export function useWorkspaceEvents(
  workspaceId: string,
  handlers: Record<string, Handler>
) {
  const handlersRef = useRef(handlers);

  useEffect(() => {
    handlersRef.current = handlers;
  });

  const eventNames = Object.keys(handlers).sort().join(",");

  useEffect(() => {
    const token = localStorage.getItem("teamflow_token");

    if (!token || !workspaceId) return;

    const { socket, release } = acquireWorkspaceRoom(workspaceId, token);

    const listeners = eventNames
      .split(",")
      .filter(Boolean)
      .map((name) => {
        const listener: Handler = (payload) =>
          handlersRef.current[name]?.(payload);

        socket.on(name, listener);

        return [name, listener] as const;
      });

    return () => {
      listeners.forEach(([name, listener]) => socket.off(name, listener));
      release();
    };
  }, [workspaceId, eventNames]);
}
