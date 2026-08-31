import { useCallback, useEffect, useMemo, useRef, useState, type SetStateAction } from "react";
import { AlertTriangle, ArrowLeftRight, Bot, Check, ChevronDown, ChevronRight, CircleCheckBig, Clock3, Eye, FileText, Hand, History, LayoutGrid, LockKeyhole, MousePointer2, Network, Pencil, Play, Plus, Radio, RefreshCw, ScanSearch, Search, Sparkles, Undo2, X } from "lucide-react";
import { workspaceActions } from "./actions";
import { createAuroraWorkspace, createResearchWorkspace } from "./data";
import type { ActivityEvent, WorkspaceObject, WorkspaceState } from "./types";
import { registerCommonplaceTools, type ToolTraceEvent } from "./webmcp";
import { PlayBlock } from "./PlayBlock";

const typeIcon = { note: FileText, task: Check, decision: Sparkles, group: LayoutGrid, heading: FileText };
const groupIcon = { Product: "✦", Research: "◌", Marketing: "↗", Operations: "◈" } as Record<string, string>;
type WorkspaceExample = "aurora" | "research";

export function App() {
  const [home, setHome] = useState(false);
  const [example, setExample] = useState<WorkspaceExample>("aurora");
  const [workspace, setWorkspace] = useState<WorkspaceState>(() => createAuroraWorkspace());
  const [showActivity, setShowActivity] = useState(true);
  const [showPermissions, setShowPermissions] = useState(false);
  const [showPresent, setShowPresent] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [filter, setFilter] = useState("");
  const [webmcp, setWebmcp] = useState<{ state: "unsupported" | "registering" | "ready" | "failed"; toolCount: number; failedTools: string[] }>({ state: "unsupported", toolCount: 0, failedTools: [] });
  const [trace, setTrace] = useState<ToolTraceEvent[]>([]);
  const [focusIds, setFocusIds] = useState<string[]>([]);
  const [guideStep, setGuideStep] = useState(0);
  const [showTrace, setShowTrace] = useState(true);
  const [acceptanceNotice, setAcceptanceNotice] = useState<{ date: string; linkedObjects: number } | null>(null);
  const latest = useRef(workspace);
  const undoStack = useRef<WorkspaceState[]>([]);
  const redoStack = useRef<WorkspaceState[]>([]);
  const guideTimers = useRef<number[]>([]);
  latest.current = workspace;

  const applyWorkspace = useCallback((action: SetStateAction<WorkspaceState>) => {
    const current = latest.current;
    const next = typeof action === "function" ? action(current) : action;
    if (next === current) return;
    undoStack.current = [...undoStack.current.slice(-19), current];
    redoStack.current = [];
    setWorkspace(next);
    setCanUndo(true);
    setCanRedo(false);
  }, []);

  const undo = useCallback(() => {
    const previous = undoStack.current.pop();
    if (!previous) return;
    redoStack.current = [...redoStack.current.slice(-19), latest.current];
    setWorkspace(previous);
    setCanUndo(undoStack.current.length > 0);
    setCanRedo(true);
  }, []);

  const redo = useCallback(() => {
    const next = redoStack.current.pop();
    if (!next) return;
    undoStack.current = [...undoStack.current.slice(-19), latest.current];
    setWorkspace(next); setCanUndo(true); setCanRedo(redoStack.current.length > 0);
  }, []);

  const appendTrace = useCallback((event: ToolTraceEvent) => setTrace((current) => [...current.slice(-11), event]), []);

  useEffect(() => {
    const registration = registerCommonplaceTools(() => latest.current, applyWorkspace, appendTrace);
    let active = true;
    setWebmcp(registration.supported ? { state: "registering", toolCount: registration.toolCount, failedTools: [] } : { state: "unsupported", toolCount: 0, failedTools: [] });
    registration.ready.then((result) => { if (active) setWebmcp({ state: result.state, toolCount: result.registered, failedTools: result.failedTools }); });
    return () => { active = false; registration.cleanup(); };
  }, [appendTrace, applyWorkspace]);

  const selected = workspace.objects.find((object) => object.id === workspace.selectedId) ?? workspace.objects[0];
  const groups = workspace.objects.filter((object) => object.type === "group");
  const cardById = useMemo(() => new Map(workspace.objects.map((object) => [object.id, object])), [workspace.objects]);

  const runAgent = useCallback(() => {
    setIsRunning(true);
    applyWorkspace((current) => ({ ...workspaceActions.organizeAurora(current), agentStatus: "working" }));
    window.setTimeout(() => {
      applyWorkspace((current) => ({ ...current, agentStatus: "waiting", activity: [...current.activity, { id: `event-${Date.now()}`, actor: "agent", text: current.id === "aurora-launch" ? "Waiting for your decision" : "Waiting for evidence validation", at: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }), objectIds: [current.selectedId] }] }));
      setIsRunning(false);
    }, 1200);
  }, [applyWorkspace]);

  const updateHumanObject = useCallback((id: string, patch: Partial<WorkspaceObject>) => {
    applyWorkspace((current) => {
      const updated = workspaceActions.updateObject(current, id, patch, "human");
      return id === "beta-feedback" ? workspaceActions.markProposalStale(updated, id) : updated;
    });
    if (id === "beta-feedback") {
      appendTrace({ id: `human-evidence-${Date.now()}`, tool: "human_updated_evidence", summary: "Human changed Beta feedback. The earlier proposal is no longer safe to accept.", objectIds: ["beta-feedback", "launch-date"], at: "now", outcome: "success", source: "human" });
      setFocusIds(["beta-feedback", "launch-date"]); setShowTrace(true);
    }
  }, [appendTrace, applyWorkspace]);

  const addCriticalEvidence = useCallback(() => {
    applyWorkspace((current) => {
      const updated = workspaceActions.updateObject(current, "beta-feedback", { content: "68 responses · 9 critical onboarding regressions", priority: "high" }, "human");
      return { ...workspaceActions.markProposalStale(updated, "beta-feedback"), selectedId: "launch-date" };
    });
    appendTrace({ id: `human-evidence-${Date.now()}`, tool: "human_updated_evidence", summary: "Human added critical beta evidence. The earlier proposal is now stale and cannot be accepted.", objectIds: ["beta-feedback", "launch-date"], at: "now", outcome: "success", source: "human" });
    setFocusIds(["beta-feedback", "launch-date"]); setShowTrace(false);
  }, [appendTrace, applyWorkspace]);
  const previewEvidenceRecheck = useCallback(() => {
    setIsRunning(true); setShowTrace(true); setFocusIds(["beta-feedback", "launch-date", "fix-signup"]);
    appendTrace({ id: `history-${Date.now()}`, tool: "get_history", summary: "Local preview: re-read the human evidence change before making another recommendation.", objectIds: ["beta-feedback"], at: "now", outcome: "success", source: "demo" });
    window.setTimeout(() => appendTrace({ id: `objects-${Date.now()}`, tool: "get_objects", summary: "Local preview: read the dependent launch decision and onboarding task.", objectIds: ["beta-feedback", "launch-date", "fix-signup"], at: "now", outcome: "success", source: "demo" }), 450);
    window.setTimeout(() => { applyWorkspace((current) => workspaceActions.proposeEvidenceRecheck(current)); appendTrace({ id: `recheck-${Date.now()}`, tool: "propose_changes", summary: "Local preview: proposed October 28 only after re-reading the edited human evidence.", objectIds: ["beta-feedback", "launch-date"], at: "now", outcome: "success", source: "demo" }); setIsRunning(false); setShowTrace(false); }, 900);
  }, [appendTrace, applyWorkspace]);

  const runGuidedCollaboration = useCallback(() => {
    guideTimers.current.forEach((timer) => window.clearTimeout(timer));
    guideTimers.current = [];
    setGuideStep(0); setShowTrace(true); setFocusIds(["launch-date"]); setTrace([]);
    const add = (tool: string, summary: string, objectIds: string[]) => appendTrace({ id: `guided-${Date.now()}-${tool}`, tool, summary, objectIds, at: "now", outcome: "success", source: "demo" });
    add("inspect_workspace", "Read the launch plan, its groups, permissions, and unresolved decisions.", []);
    guideTimers.current.push(window.setTimeout(() => {
      setGuideStep(1); setFocusIds(["beta-feedback", "launch-date"]);
      add("get_objects", "Read Beta feedback and Launch date as the same structured objects shown on the canvas.", ["beta-feedback", "launch-date"]);
    }, 650));
    guideTimers.current.push(window.setTimeout(() => {
      setGuideStep(1); setShowTrace(false); setFocusIds(["beta-feedback", "launch-date"]);
      add("propose_changes", "Proposed October 21. The canvas has not changed; human approval is still required.", ["launch-date"]);
      applyWorkspace((current) => ({ ...current, agentStatus: "waiting" }));
    }, 1300));
    guideTimers.current.push(window.setTimeout(() => {
      setGuideStep(2); setFocusIds(["beta-feedback", "launch-date"]);
      applyWorkspace((current) => {
        const updated = workspaceActions.updateObject(current, "beta-feedback", { content: "68 responses · 9 critical onboarding regressions", priority: "high" }, "human");
        return { ...workspaceActions.markProposalStale(updated, "beta-feedback"), selectedId: "launch-date" };
      });
      add("human_updated_evidence", "Local preview: new human evidence invalidated the old proposal before it could be accepted.", ["beta-feedback", "launch-date"]);
    }, 1950));
    guideTimers.current.push(window.setTimeout(() => {
      setShowTrace(true);
      add("get_history", "Local preview: the agent re-read the human evidence change before making another recommendation.", ["beta-feedback"]);
    }, 2600));
    guideTimers.current.push(window.setTimeout(() => {
      add("get_objects", "Local preview: the agent re-read the affected decision and onboarding work.", ["beta-feedback", "launch-date", "fix-signup"]);
    }, 3100));
    guideTimers.current.push(window.setTimeout(() => {
      applyWorkspace((current) => workspaceActions.proposeEvidenceRecheck(current));
      add("propose_changes", "Local preview: proposed October 28 only after re-reading the edited human evidence.", ["beta-feedback", "launch-date"]);
      setGuideStep(3); setShowTrace(false); setIsRunning(false);
    }, 3650));
  }, [appendTrace, applyWorkspace]);

  const switchExample = (next: WorkspaceExample) => { setExample(next); undoStack.current = []; redoStack.current = []; setCanUndo(false); setCanRedo(false); setAcceptanceNotice(null); setWorkspace(next === "aurora" ? createAuroraWorkspace() : createResearchWorkspace()); setHome(false); };
  const reset = () => { undoStack.current = []; redoStack.current = []; setCanUndo(false); setCanRedo(false); setAcceptanceNotice(null); setFilter(""); setWorkspace(example === "aurora" ? createAuroraWorkspace() : createResearchWorkspace()); };
  const createObject = (type: WorkspaceObject["type"]) => applyWorkspace((current) => workspaceActions.createObjects(current, [{ id: `${type}-${Date.now()}`, type, title: type === "task" ? "New shared task" : type === "decision" ? "New human decision" : type === "group" ? "New workspace group" : "New shared note", content: type === "decision" ? "Needs a human decision" : "Created by a human", x: 430, y: 650, status: type === "decision" ? "unresolved" : "open", approval: type === "decision" ? "pending" : "not_required" }], "human"));
  const connectSelected = () => applyWorkspace((current) => { const from = current.selectedId; const to = from === "launch-date" ? "beta-feedback" : "launch-date"; if (current.connections.some((connection) => connection.from === from && connection.to === to)) return current; return workspaceActions.connect(current, { from, to, relationship: "related_to" }, "human"); });

  if (home) return <Landing onOpen={switchExample} />;

  return <main className={`app-shell v2-shell ${showPresent ? "presenting" : ""}`}>
    {!showPresent && <Sidebar onReset={reset} onUndo={undo} onRedo={redo} canUndo={canUndo} canRedo={canRedo} filter={filter} onFilter={setFilter} guideStep={guideStep} onStart={runGuidedCollaboration} />}
    <section className="workspace-shell">
      {!showPresent && <Header name={workspace.name} webmcp={webmcp} onStart={runGuidedCollaboration} onPresent={() => setShowPresent(true)} onSwitch={() => switchExample(example === "aurora" ? "research" : "aurora")} />}
      <div className="workspace-body">
        <Canvas workspace={workspace} groups={groups} cardById={cardById} focusIds={focusIds} filter={filter} onSelect={(id) => { setShowTrace(false); applyWorkspace((current) => workspaceActions.select(current, id)); }} onMove={(id, x, y, ungroup) => applyWorkspace((current) => workspaceActions.moveObjects(current, [{ id, x, y }], "human", ungroup))} />
        <PlayBlock />
        {showPresent && <button className="exit-present" onClick={() => setShowPresent(false)}><X size={16} /> Exit present mode</button>}
        {!showPresent && <CanvasControls onRun={workspace.proposal?.status === "stale" ? previewEvidenceRecheck : runAgent} isRunning={isRunning} onCreate={createObject} onConnect={connectSelected} stale={workspace.proposal?.status === "stale"} />}
      </div>
    </section>
    {!showPresent && <Inspector selected={selected} workspace={workspace} trace={trace} showTrace={showTrace} focusIds={focusIds} acceptanceNotice={acceptanceNotice} onTraceClick={(event) => { setFocusIds(event.objectIds ?? []); event.objectIds?.[0] && applyWorkspace((current) => workspaceActions.select(current, event.objectIds![0])); }} onShowObject={() => setShowTrace(false)} onShowTrace={() => setShowTrace(true)} onUpdate={updateHumanObject} onAddEvidence={addCriticalEvidence} onPreviewRecheck={previewEvidenceRecheck} onToggleLock={(id, locked) => updateHumanObject(id, { locked })} onVerifyLock={(object) => { try { workspaceActions.updateObject(latest.current, object.id, { content: "Agent attempted an edit" }, "agent"); } catch (error) { appendTrace({ id: `blocked-${Date.now()}`, tool: "update_objects", summary: error instanceof Error ? error.message : "The human lock blocked the agent.", objectIds: [object.id], at: "now", outcome: "error", source: "demo" }); setShowTrace(true); } }} onAccept={() => { const proposal = latest.current.proposal; const proposedUpdate = proposal?.operations?.find((operation) => operation.kind === "update" && operation.id === "launch-date"); const acceptedDate = proposedUpdate?.kind === "update" ? proposedUpdate.patch.content ?? "the updated date" : "the updated date"; const linkedObjects = latest.current.connections.filter((connection) => connection.from === "launch-date" || connection.to === "launch-date").length; applyWorkspace((current) => workspaceActions.acceptProposal(current)); appendTrace({ id: `human-${Date.now()}`, tool: "human_accepted_proposal", summary: `Human accepted ${proposal?.summary ?? "the proposal"}. The shared canonical object updated.`, objectIds: ["launch-date"], at: "now", outcome: "success", source: "human" }); setAcceptanceNotice({ date: acceptedDate, linkedObjects }); setGuideStep(3); setShowTrace(false); setFocusIds(["launch-date"]); }} onReject={() => applyWorkspace((current) => workspaceActions.rejectProposal(current))} onPermissions={() => setShowPermissions(true)} showActivity={showActivity} />}
    {showPermissions && <Permissions workspace={workspace} onToggle={(key) => applyWorkspace((current) => ({ ...current, permissions: { ...current.permissions, [key]: !current.permissions[key] } }))} onClose={() => setShowPermissions(false)} />}
  </main>;
}

function Landing({ onOpen }: { onOpen: (example: WorkspaceExample) => void }) {
  return <main className="landing">
    <header className="landing-nav"><div className="brand"><span className="brand-mark" /><strong>Commonplace</strong></div><nav><button>Workspaces</button><button>Templates</button><button className="landing-open" onClick={() => onOpen("aurora")}>Open workspace <ArrowLeftRight size={15} /></button></nav></header>
    <section className="landing-hero"><div className="landing-copy"><h1>One place for humans and agents to work together.</h1><p>Humans have interfaces. Agents have APIs. Commonplace gives them a shared workspace.</p><div className="hero-actions"><button className="hero-primary" onClick={() => onOpen("aurora")}><Play size={15} fill="currentColor" />Open Project Aurora</button><button className="hero-link" onClick={() => onOpen("research")}>Explore Research Board <ArrowLeftRight size={16} /></button></div></div><div className="landing-preview" aria-label="Commonplace workspace preview"><div className="preview-bar"><span className="brand-mark" />Project Aurora Launch <span className="preview-status"><i />Agent connected</span></div><div className="preview-canvas"><div className="mini-group product"><b>✦ Product</b><span>Fix signup bug</span><span>Improve onboarding</span></div><div className="mini-group research"><b>◌ Research</b><span>Beta feedback</span><span>Customer interviews</span></div><div className="mini-decision"><Sparkles size={16} /><b>Launch date</b><strong>October 14?</strong><small>Needs decision</small></div><div className="mini-line line-one" /><div className="mini-line line-two" /><div className="mini-agent"><b>Commonplace Agent</b><span>Requested a human decision</span></div></div></div></section>
    <section className="shared-statement"><div><span>Human</span><p>Click, drag, write, decide.</p></div><div className="statement-center"><span>Commonplace</span><p>Shared semantic objects.</p></div><div><span>Agent</span><p>Inspect, organize, transform.</p></div></section>
  </main>;
}

function Sidebar({ onReset, onUndo, onRedo, canUndo, canRedo, filter, onFilter, guideStep, onStart }: { onReset: () => void; onUndo: () => void; onRedo: () => void; canUndo: boolean; canRedo: boolean; filter: string; onFilter: (value: string) => void; guideStep: number; onStart: () => void }) {
  const steps = [
    ["Read one shared workspace", "The agent sees the same decision objects you see."],
    ["Review a safe proposal", "The canvas does not change until a human approves it."],
    ["New human evidence invalidates it", "The old proposal is frozen before it can be accepted."],
    ["Re-check, then decide", "The agent re-reads context; only a human can confirm the fresh change."]
  ];
  return <aside className="sidebar">
    <div className="brand"><span className="brand-mark" /> <strong>Commonplace</strong></div>
    <section className="collaboration-guide"><span className="guide-kicker">Judge the collaboration</span><h2>One decision. Shared context.</h2><p>See the exact moment fresh human evidence forces an agent to re-check its work.</p><label className="workspace-filter"><Search size={14} /><input value={filter} onChange={(event) => onFilter(event.target.value)} placeholder="Filter workspace" /></label><ol>{steps.map(([title, detail], index) => <li className={guideStep > index ? "complete" : guideStep === index ? "active" : ""} key={title}><b>{index + 1}</b><span>{title}<small>{detail}</small></span></li>)}</ol><button className="guide-start" onClick={onStart}><Sparkles size={15} />Run the 5-second proof</button><small className="guide-disclosure">Human evidence freezes stale proposals. Watch the re-check. Local previews and native calls are labeled separately.</small></section>
    <div className="nav-spacer" />
    <button className="nav-item" onClick={onUndo} disabled={!canUndo}><Undo2 size={17} strokeWidth={1.65} /> Undo last change</button>
    <button className="nav-item" onClick={onRedo} disabled={!canRedo}><History size={17} strokeWidth={1.65} /> Redo last change</button>
    <button className="nav-item" onClick={onReset}><Undo2 size={17} strokeWidth={1.65} /> Reset demo</button>
  </aside>;
}

function Header({ name, webmcp, onStart, onPresent, onSwitch }: { name: string; webmcp: { state: "unsupported" | "registering" | "ready" | "failed"; toolCount: number; failedTools: string[] }; onStart: () => void; onPresent: () => void; onSwitch: () => void }) {
  const copy = webmcp.state === "ready" ? [`WebMCP live · ${webmcp.toolCount} tools registered`, "Native browser tools are ready for an agent."] : webmcp.state === "registering" ? ["WebMCP registering tools…", "Waiting for browser confirmation."] : webmcp.state === "failed" ? [`WebMCP setup incomplete · ${webmcp.toolCount} ready`, `${webmcp.failedTools.join(", ")} could not register.`] : ["WebMCP unavailable in this browser", "Use ChatGPT’s browser or Chrome with WebMCP testing."];
  return <header className="workspace-header">
    <button className="workspace-name" onClick={onSwitch}>{name} <ChevronDown size={16} /></button>
    <div className={`webmcp-state ${webmcp.state}`}><Radio size={15} /><span><b>{copy[0]}</b><small>{copy[1]}</small></span></div>
    <div className="header-right">
      <button className="v2-start" onClick={onStart}><Sparkles size={15} />Try the collaboration</button>
      <button className="present-button" onClick={onPresent}><Play size={15} fill="currentColor" />Present</button>
    </div>
  </header>;
}

function Canvas({ workspace, groups, cardById, focusIds, filter, onSelect, onMove }: { workspace: WorkspaceState; groups: WorkspaceObject[]; cardById: Map<string, WorkspaceObject>; focusIds: string[]; filter: string; onSelect: (id: string) => void; onMove: (id: string, x: number, y: number, ungroup?: boolean) => void }) {
  const matches = (object: WorkspaceObject) => !filter.trim() || `${object.title} ${object.content ?? ""} ${object.type}`.toLowerCase().includes(filter.toLowerCase());
  return <div className="canvas" aria-label="Commonplace shared workspace">
    <svg className="connections" aria-hidden="true" viewBox="0 0 920 780" preserveAspectRatio="none">
      <defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8" fill="none" stroke="currentColor" strokeWidth="1.2" /></marker></defs>
      {workspace.connections.map((connection) => {
        const from = cardById.get(connection.from); const to = cardById.get(connection.to);
        if (!from || !to) return null;
        const sx = from.x + 115; const sy = from.y + 37; const tx = to.x + 115; const ty = to.y + 37;
        const mid = (sx + tx) / 2;
        return <path key={connection.id} d={`M ${sx} ${sy} C ${mid} ${sy}, ${mid} ${ty}, ${tx} ${ty}`} markerEnd="url(#arrow)" />;
      })}
    </svg>
    {groups.filter((group) => matches(group) || workspace.objects.some((object) => object.groupId === group.id && matches(object))).map((group) => <Group key={group.id} group={group} objects={workspace.objects.filter((object) => object.groupId === group.id && matches(object))} selectedId={workspace.selectedId} focusIds={focusIds} onSelect={onSelect} onMove={onMove} />)}
    {workspace.objects.filter((object) => !object.groupId && object.type !== "group" && matches(object)).map((object) => <CanvasCard key={object.id} object={object} selected={object.id === workspace.selectedId} focused={focusIds.includes(object.id)} onSelect={onSelect} onMove={onMove} />)}
  </div>;
}

function Group({ group, objects, selectedId, focusIds, onSelect, onMove }: { group: WorkspaceObject; objects: WorkspaceObject[]; selectedId: string; focusIds: string[]; onSelect: (id: string) => void; onMove: (id: string, x: number, y: number, ungroup?: boolean) => void }) {
  return <section className="group" style={{ left: `${(group.x / 920) * 100}%`, top: `${(group.y / 780) * 100}%` }}>
    <div className="group-title"><span>{groupIcon[group.title] ?? "✦"}</span><strong>{group.title}</strong><em>{objects.length} objects</em></div>
    <div className="group-stack">{objects.map((object) => <CanvasCard key={object.id} object={object} selected={object.id === selectedId} focused={focusIds.includes(object.id)} onSelect={onSelect} onMove={onMove} withinGroup />)}</div>
  </section>;
}

function CanvasCard({ object, selected, focused, onSelect, onMove, withinGroup = false }: { object: WorkspaceObject; selected: boolean; focused: boolean; onSelect: (id: string) => void; onMove: (id: string, x: number, y: number, ungroup?: boolean) => void; withinGroup?: boolean }) {
  const Icon = typeIcon[object.type];
  const drag = useRef<{ x: number; y: number; active: boolean; source: "pointer" | "mouse" | null }>({ x: 0, y: 0, active: false, source: null });
  const startDrag = (x: number, y: number, source: "pointer" | "mouse") => { drag.current = { x, y, active: false, source }; };
  const trackDrag = (x: number, y: number) => { if (Math.abs(x - drag.current.x) + Math.abs(y - drag.current.y) > 6) drag.current.active = true; };
  const finishDrag = (x: number, y: number) => { if (drag.current.active) onMove(object.id, object.x + x - drag.current.x, object.y + y - drag.current.y, withinGroup); drag.current.source = null; };
  const onPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => { startDrag(event.clientX, event.clientY, "pointer"); event.currentTarget.setPointerCapture(event.pointerId); };
  const onPointerMove = (event: React.PointerEvent<HTMLButtonElement>) => trackDrag(event.clientX, event.clientY);
  const onPointerUp = (event: React.PointerEvent<HTMLButtonElement>) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); finishDrag(event.clientX, event.clientY); };
  const onMouseDown = (event: React.MouseEvent<HTMLButtonElement>) => { if (drag.current.source !== "pointer") startDrag(event.clientX, event.clientY, "mouse"); };
  const onMouseMove = (event: React.MouseEvent<HTMLButtonElement>) => { if (drag.current.source === "mouse") trackDrag(event.clientX, event.clientY); };
  const onMouseUp = (event: React.MouseEvent<HTMLButtonElement>) => { if (drag.current.source === "mouse") finishDrag(event.clientX, event.clientY); };
  const decision = object.type === "decision";
  const evidenceChanged = object.id === "beta-feedback" && object.modifiedBy === "human";
  return <button className={`canvas-card ${decision ? "decision-card" : ""} ${selected ? "selected" : ""} ${focused ? "focused" : ""} ${object.locked ? "locked" : ""} ${evidenceChanged ? "human-edited" : ""}`} style={withinGroup ? undefined : { left: `${(object.x / 920) * 100}%`, top: `${(object.y / 780) * 100}%` }} onClick={() => onSelect(object.id)} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp}>
    <span className="card-icon"><Icon size={16} strokeWidth={1.7} /></span>
    <span className="card-copy"><strong>{object.title}</strong>{object.content && <small>{object.content}</small>}{object.priority && <small className="card-meta">{object.priority === "high" ? "P1" : "P2"} · {object.modifiedBy === "agent" ? "Agent updated" : "Human created"}</small>}</span>
    {object.locked && <LockKeyhole className="card-lock" size={15} />}
    {decision && <span className="decision-chip">Needs decision</span>}
  </button>;
}

function CanvasControls({ onRun, isRunning, onCreate, onConnect, stale }: { onRun: () => void; isRunning: boolean; onCreate: (type: WorkspaceObject["type"]) => void; onConnect: () => void; stale: boolean }) {
  return <><div className="canvas-tools"><button title="Create a shared note" onClick={() => onCreate("note")}><Plus size={16} /> Note</button><button title="Create a shared task" onClick={() => onCreate("task")}><Check size={16} /> Task</button><button title="Create a human decision" onClick={() => onCreate("decision")}><Sparkles size={16} /> Decision</button><button title="Create a workspace group" onClick={() => onCreate("group")}><LayoutGrid size={16} /> Group</button><button title="Link selected object to the launch decision" onClick={onConnect}><Network size={16} /> Link</button></div><button className={`agent-demo-trigger ${stale ? "recheck" : ""}`} onClick={onRun} disabled={isRunning}>{stale ? <RefreshCw size={17} /> : <Bot size={17} />}{isRunning ? "Re-reading shared evidence…" : stale ? "Preview local re-check" : "Preview safe agent action"}</button></>;
}

function Inspector({ selected, workspace, trace, showTrace, acceptanceNotice, onTraceClick, onShowObject, onShowTrace, onUpdate, onAddEvidence, onPreviewRecheck, onToggleLock, onVerifyLock, onAccept, onReject, onPermissions, showActivity }: { selected: WorkspaceObject; workspace: WorkspaceState; trace: ToolTraceEvent[]; showTrace: boolean; focusIds: string[]; acceptanceNotice: { date: string; linkedObjects: number } | null; onTraceClick: (event: ToolTraceEvent) => void; onShowObject: () => void; onShowTrace: () => void; onUpdate: (id: string, patch: Partial<WorkspaceObject>) => void; onAddEvidence: () => void; onPreviewRecheck: () => void; onToggleLock: (id: string, locked: boolean) => void; onVerifyLock: (object: WorkspaceObject) => void; onAccept: () => void; onReject: () => void; onPermissions: () => void; showActivity: boolean }) {
  const proposal = workspace.proposal;
  return <aside className="inspector v2-inspector">
    <div className="inspector-tabs"><button className={!showTrace ? "active" : ""} onClick={onShowObject}><Pencil size={14} />Object</button><button className={showTrace ? "active" : ""} onClick={onShowTrace}><ScanSearch size={14} />Agent trace</button></div>
    {showTrace ? <TracePanel trace={trace} onSelect={onTraceClick} /> : <>
    <div className="inspector-top"><span className="inspector-kind"><Sparkles size={15} /> {selected.type}</span></div>
    <div className="inspector-title"><h2>{selected.title}</h2><p>{selected.content}</p><span className={selected.status === "confirmed" ? "state-chip confirmed" : "state-chip"}>{selected.status === "confirmed" ? "Human confirmed" : "Agent proposal"}</span></div>
    {acceptanceNotice && selected.id === "launch-date" && <AcceptanceConfirmation date={acceptanceNotice.date} linkedObjects={acceptanceNotice.linkedObjects} />}
    <InlineEditor selected={selected} onUpdate={onUpdate} onToggleLock={onToggleLock} />
    {selected.id === "beta-feedback" && <button className="evidence-action" onClick={onAddEvidence}><Hand size={14} /> Add critical beta evidence</button>}
    {proposal?.status === "pending" && selected.type === "decision" ? <Proposal proposal={proposal} onAccept={onAccept} onReject={onReject} /> : proposal?.status === "stale" && selected.type === "decision" ? <StaleProposal onPreview={onPreviewRecheck} /> : <DecisionDetails selected={selected} onPermissions={onPermissions} onVerifyLock={onVerifyLock} />}
    {showActivity && <ActivityPanel events={workspace.activity} />}
    </>}
  </aside>;
}

function AcceptanceConfirmation({ date, linkedObjects }: { date: string; linkedObjects: number }) {
  return <section className="acceptance-confirmation" aria-live="polite"><span><CircleCheckBig size={15} /> Decision confirmed by human</span><h3>Launch date updated to {date}</h3><p>{linkedObjects} linked {linkedObjects === 1 ? "object remains" : "objects remain"} connected. The evidence and accepted proposal are retained in shared history.</p></section>;
}

function InlineEditor({ selected, onUpdate, onToggleLock }: { selected: WorkspaceObject; onUpdate: (id: string, patch: Partial<WorkspaceObject>) => void; onToggleLock: (id: string, locked: boolean) => void }) {
  const [editing, setEditing] = useState(false); const [title, setTitle] = useState(selected.title); const [content, setContent] = useState(selected.content ?? "");
  useEffect(() => { setTitle(selected.title); setContent(selected.content ?? ""); setEditing(false); }, [selected.id, selected.title, selected.content]);
  if (!editing) return <div className="object-actions"><button className="inline-edit" onClick={() => setEditing(true)}><Pencil size={14} /> Edit shared object</button><button className="lock-edit" onClick={() => onToggleLock(selected.id, !selected.locked)}><LockKeyhole size={13} />{selected.locked ? "Unlock for agent" : "Lock for agent"}</button></div>;
  return <section className="inline-editor"><label>Title<input value={title} onChange={(event) => setTitle(event.target.value)} /></label><label>Detail<textarea value={content} onChange={(event) => setContent(event.target.value)} /></label><div><button onClick={() => { onUpdate(selected.id, { title, content }); setEditing(false); }}><Check size={14} />Save</button><button onClick={() => setEditing(false)}>Cancel</button></div></section>;
}

function TracePanel({ trace, onSelect }: { trace: ToolTraceEvent[]; onSelect: (event: ToolTraceEvent) => void }) {
  const starter: ToolTraceEvent[] = [
    { id: "starter-1", tool: "inspect_workspace", summary: "Example read-only tool. Native invocations are labeled separately.", at: "preview", outcome: "success", source: "demo" },
    { id: "starter-2", tool: "get_objects", summary: "Example shared-object read. Click a row to highlight its affected cards.", objectIds: ["beta-feedback", "launch-date"], at: "preview", outcome: "success", source: "demo" },
  ];
  const events = trace.length ? trace : starter;
  return <section className="trace-panel"><div className="trace-heading"><div><span>Agent trace</span><p>{trace.length ? "Every row names who or what produced it." : "Start a walkthrough or invoke a native tool to populate the ledger."}</p></div><Radio size={17} /></div><div className="trace-list">{events.map((event, index) => <button key={event.id} className={`trace-event ${event.outcome} ${event.source}`} onClick={() => onSelect(event)}><span className="trace-number">{index + 1}</span><div><b>{event.tool}</b><p>{event.summary}</p><small><i className={`trace-source ${event.source}`}>{event.source === "native" ? "Native WebMCP" : event.source === "human" ? "Human" : "Local preview"}</i>{event.at}</small></div><ChevronRight size={15} /></button>)}</div><div className="trace-foot"><CircleCheckBig size={15} />Native WebMCP, local previews, and human decisions remain distinct.</div></section>;
}

function Proposal({ proposal, onAccept, onReject }: { proposal: NonNullable<WorkspaceState["proposal"]>; onAccept: () => void; onReject: () => void }) {
  return <section className="proposal"><div className="proposal-heading"><span>Agent proposal</span><b>{proposal.confidence}% confidence</b></div><h3>{proposal.summary}</h3><p>{proposal.reason}</p><div className="proposal-impact">{proposal.changes.map((change) => <div key={change}><ArrowLeftRight size={14} />{change}</div>)}</div><button className="accept-button" onClick={onAccept}><Check size={16} />Accept all</button><button className="outline-action reject" onClick={onReject}><X size={16} />Reject</button></section>;
}

function StaleProposal({ onPreview }: { onPreview: () => void }) {
  return <section className="stale-proposal"><span><AlertTriangle size={15} /> Proposal stale after a human edit</span><h3>Agent must re-read the evidence.</h3><p>Acceptance is deliberately paused. A native agent should call <b>get_history</b> and <b>get_objects</b> before sending a replacement proposal.</p><button className="recheck-button" onClick={onPreview}><RefreshCw size={15} /> Preview local re-check path</button></section>;
}

function DecisionDetails({ selected, onPermissions, onVerifyLock }: { selected: WorkspaceObject; onPermissions: () => void; onVerifyLock: (object: WorkspaceObject) => void }) {
  return <section className="detail-list"><div><span>Type</span><b>{selected.type}</b></div>{selected.status && <div><span>Status</span><b>{selected.status === "confirmed" ? "Confirmed" : selected.status.replace("_", " ")}</b></div>}{selected.confidence !== undefined && <div><span>Confidence</span><b>{selected.confidence}%</b></div>}{selected.locked && <div><span>Human lock</span><b>Protected</b></div>}<div><span>Created by</span><b>{selected.createdBy === "agent" ? "Commonplace Agent" : "Ezra"}</b></div><div><span>Last modified by</span><b>{selected.modifiedBy === "agent" ? "Commonplace Agent" : "Ezra"}</b></div>{selected.locked && <button className="boundary-test" onClick={() => onVerifyLock(selected)}><AlertTriangle size={14} /> Test agent boundary</button>}<button className="permission-link" onClick={onPermissions}><LockKeyhole size={15} /> View agent access</button></section>;
}

function ActivityPanel({ events }: { events: ActivityEvent[] }) {
  return <section className="activity-panel"><div className="activity-title"><span><Bot size={16} />Commonplace Agent</span><i>Active</i></div>{events.slice(-5).reverse().map((event) => <div className="activity-event" key={event.id}><Clock3 size={14} /><div><p>{event.text}</p><small>{event.actor === "human" ? "You" : "Agent"} · {event.at}</small></div></div>)}</section>;
}

function Permissions({ workspace, onToggle, onClose }: { workspace: WorkspaceState; onToggle: (key: keyof WorkspaceState["permissions"]) => void; onClose: () => void }) {
  const entries = [["Read workspace", "read"], ["Create objects", "create"], ["Modify unlocked objects", "modify"], ["Reorganize canvas", "reorganize"], ["Connect objects", "connect"], ["Delete objects", "delete"]] as const;
  return <div className="modal-backdrop" onMouseDown={onClose}><section className="permissions-modal" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" onClick={onClose}><X size={19} /></button><span className="modal-icon"><LockKeyhole size={20} /></span><h2>Commonplace access</h2><p>Agents receive explicit capabilities. Destructive changes stay human-controlled.</p><div className="permission-list">{entries.map(([label, key]) => <button key={key} onClick={() => onToggle(key)}><span>{label}</span><b className={workspace.permissions[key] ? "allowed" : "denied"}>{workspace.permissions[key] ? "Allowed" : "Off"}</b></button>)}</div><button className="accept-button" onClick={onClose}>Done</button></section></div>;
}
