import { useCallback, useRef, useState } from "react";
import { defaultProject, type Project } from "./model";
export function useProject() {
  const [project, setProject] = useState<Project>(() =>
    defaultProject("annual"),
  );
  const past = useRef<Project[]>([]),
    future = useRef<Project[]>([]);
  const current = useRef(project);
  const [revision, setRevision] = useState(0);
  const commit = useCallback((action: Project | ((p: Project) => Project)) => {
    const old = current.current,
      next = typeof action === "function" ? action(old) : action;
    if (JSON.stringify(old) === JSON.stringify(next)) return;
    past.current.push(old);
    let bytes = 0;
    past.current = past.current
      .slice(-40)
      .reverse()
      .filter((p) => {
        bytes += JSON.stringify(p).length;
        return bytes < 60_000_000;
      })
      .reverse();
    future.current = [];
    current.current = next;
    setProject(next);
    setRevision((r) => r + 1);
  }, []);
  const undo = useCallback(() => {
    const next = past.current.pop();
    if (next) {
      future.current.push(current.current);
      current.current = next;
      setProject(next);
      setRevision((r) => r + 1);
    }
  }, []);
  const redo = useCallback(() => {
    const next = future.current.pop();
    if (next) {
      past.current.push(current.current);
      current.current = next;
      setProject(next);
      setRevision((r) => r + 1);
    }
  }, []);
  return {
    project,
    commit,
    undo,
    redo,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
    revision,
  };
}
