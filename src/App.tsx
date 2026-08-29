import { useCallback, useEffect, useMemo, useRef, useState, type SetStateAction } from "react";
import { AlertTriangle, ArrowLeftRight, Bot, Check, ChevronDown, ChevronRight, CircleCheckBig, CircleHelp, Clock3, Eye, FileText, Grip, Hand, History, LayoutGrid, LockKeyhole, MoreHorizontal, MousePointer2, Network, Pencil, Play, Plus, Radio, ScanSearch, Search, Settings, Sparkles, Undo2, X } from "lucide-react";
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
  const [webmcp, setWebmcp] = useState({ supported: false, toolCount: 0 });
  const [trace, setTrace] = useState<ToolTraceEvent[]>([]);
  const [focusIds, setFocusIds] = useState<string[]>([]);
  const [guideStep, setGuideStep] = useState(0);
  const [showTrace, setShowTrace] = useState(true);
  const latest = useRef(workspace);
  const undoStack = useRef<WorkspaceState[]>([]);
  latest.current = workspace;

  const applyWorkspace = useCallback((action: SetStateAction<WorkspaceState>) => {
    setWorkspace((current) => {
      const next = typeof action === "function" ? action(current) : action;
      if (next !== current) undoStack.current = [...undoStack.current.slice(-19), current];
      return next;
    });
    setCanUndo(true);
  }, []);

  const undo = useCallback(() => {
    const previous = undoStack.current.pop();
    if (!previous) return;
    setWorkspace(previous);
    setCanUndo(undoStack.current.length > 0);
  }, []);

  const appendTrace = useCallback((event: ToolTraceEvent) => setTrace((current) => [...current.slice(-11), event]), []);

  useEffect(() => {
    const registration = registerCommonplaceTools(() => latest.current, applyWorkspace, appendTrace);
    setWebmcp({ supported: registration.supported, toolCount: registration.toolCount });
    return registration.cleanup;
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

  const runGuidedCollaboration = useCallback(() => {
    window.clearTimeout((window as Window & { commonplaceGuideTimer?: number }).commonplaceGuideTimer);
    setGuideStep(1); setShowTrace(true); setFocusIds(["launch-date"]); setTrace([]);
    const add = (tool: string, summary: string, objectIds: string[]) => appendTrace({ id: `guided-${Date.now()}-${tool}`, tool, summary, objectIds, at: "now", outcome: "success" });
    add("inspect_workspace", "Read the launch plan, its groups, permissions, and unresolved decisions.", []);
    (window as Window & { commonplaceGuideTimer?: number }).commonplaceGuideTimer = window.setTimeout(() => {
      setGuideStep(2); setFocusIds(["beta-feedback", "launch-date"]);
      add("get_objects", "Read Beta feedback and Launch date as the same structured objects shown on the canvas.", ["beta-feedback", "launch-date"]);
    }, 900);
    window.setTimeout(() => {
      setGuideStep(2); setShowTrace(false); setFocusIds(["beta-feedback", "launch-date"]);
      add("propose_changes", "Proposed October 21. The canvas has not changed; human approval is still required.", ["launch-date"]);
      applyWorkspace((current) => ({ ...current, agentStatus: "waiting" }));
    }, 1850);
  }, [appendTrace, applyWorkspace]);

  const switchExample = (next: WorkspaceExample) => { setExample(next); undoStack.current = []; setCanUndo(false); setWorkspace(next === "aurora" ? createAuroraWorkspace() : createResearchWorkspace()); setHome(false); };
  const reset = () => { undoStack.current = []; setCanUndo(false); setWorkspace(example === "aurora" ? createAuroraWorkspace() : createResearchWorkspace()); };

  if (home) return <Landing onOpen={switchExample} />;

  return <main className={`app-shell v2-shell ${showPresent ? "presenting" : ""}`}>
    {!showPresent && <Sidebar onReset={reset} onUndo={undo} canUndo={canUndo} guideStep={guideStep} onStart={runGuidedCollaboration} />}
    <section className="workspace-shell">
      {!showPresent && <Header name={workspace.name} webmcp={webmcp} onStart={runGuidedCollaboration} onPresent={() => setShowPresent(true)} onSwitch={() => switchExample(example === "aurora" ? "research" : "aurora")} />}
      <div className="workspace-body">
        <Canvas workspace={workspace} groups={groups} cardById={cardById} focusIds={focusIds} onSelect={(id) => applyWorkspace((current) => workspaceActions.select(current, id))} onMove={(id, x, y) => applyWorkspace((current) => workspaceActions.moveObjects(current, [{ id, x, y }], "human"))} />
        <PlayBlock />
        {showPresent && <button className="exit-present" onClick={() => setShowPresent(false)}><X size={16} /> Exit present mode</button>}
        {!showPresent && <CanvasControls onRun={runAgent} isRunning={isRunning} onAdd={() => applyWorkspace((current) => workspaceActions.createObjects(current, [{ id: `note-${Date.now()}`, type: "note", title: "New shared note", content: "Created by a human", x: 430, y: 665, approval: "not_required" }], "human"))} />}
      </div>
    </section>
    {!showPresent && <Inspector selected={selected} workspace={workspace} trace={trace} showTrace={showTrace} focusIds={focusIds} onTraceClick={(event) => { setFocusIds(event.objectIds ?? []); event.objectIds?.[0] && applyWorkspace((current) => workspaceActions.select(current, event.objectIds![0])); }} onToggleTrace={() => setShowTrace((value) => !value)} onUpdate={(id, patch) => applyWorkspace((current) => workspaceActions.updateObject(current, id, patch, "human"))} onAccept={() => { applyWorkspace((current) => workspaceActions.acceptProposal(current)); appendTrace({ id: `human-${Date.now()}`, tool: "human_accepted_proposal", summary: "Human accepted the proposed October 21 decision. The shared canonical object updated.", objectIds: ["launch-date"], at: "now", outcome: "success" }); setGuideStep(3); setShowTrace(true); setFocusIds(["launch-date"]); }} onReject={() => applyWorkspace((current) => workspaceActions.rejectProposal(current))} onPermissions={() => setShowPermissions(true)} showActivity={showActivity} />}
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

function Sidebar({ onReset, onUndo, canUndo, guideStep, onStart }: { onReset: () => void; onUndo: () => void; canUndo: boolean; guideStep: number; onStart: () => void }) {
  const steps = ["Orient together", "Surface the conflict", "Review the proposal", "Confirm shared state"];
  return <aside className="sidebar">
    <div className="brand"><span className="brand-mark" /> <strong>Commonplace</strong></div>
    <section className="collaboration-guide"><span className="guide-kicker">Collaboration guide</span><h2>One decision. Shared context.</h2><p>Watch the person and agent work on the same object—not separate copies.</p><ol>{steps.map((step, index) => <li className={guideStep > index ? "complete" : guideStep === index ? "active" : ""} key={step}><b>{index + 1}</b><span>{step}<small>{["Read the plan together.", "Compare evidence and uncertainty.", "Keep the change reviewable.", "Apply only after human approval."][index]}</small></span></li>)}</ol><button className="guide-start" onClick={onStart}><Sparkles size={15} />Try the 60-second collaboration</button></section>
    <div className="nav-spacer" />
    <button className="nav-item" onClick={onUndo} disabled={!canUndo}><Undo2 size={17} strokeWidth={1.65} /> Undo last change</button>
    <button className="nav-item" onClick={onReset}><Undo2 size={17} strokeWidth={1.65} /> Reset demo</button>
    <button className="nav-item"><Settings size={17} strokeWidth={1.65} /> Settings</button>
    <button className="nav-item"><CircleHelp size={17} strokeWidth={1.65} /> Help</button>
  </aside>;
}

function Header({ name, webmcp, onStart, onPresent, onSwitch }: { name: string; webmcp: { supported: boolean; toolCount: number }; onStart: () => void; onPresent: () => void; onSwitch: () => void }) {
  return <header className="workspace-header">
    <button className="workspace-name" onClick={onSwitch}>{name} <ChevronDown size={16} /></button>
    <div className={`webmcp-state ${webmcp.supported ? "live" : "unavailable"}`}><Radio size={15} /><span><b>{webmcp.supported ? `WebMCP live · ${webmcp.toolCount} tools registered` : "WebMCP unavailable in this browser"}</b><small>{webmcp.supported ? "This host can call Commonplace tools." : "Use ChatGPT’s browser or Chrome with WebMCP testing."}</small></span></div>
    <div className="header-right">
      <button className="v2-start" onClick={onStart}><Sparkles size={15} />Try the collaboration</button>
      <button className="present-button" onClick={onPresent}><Play size={15} fill="currentColor" />Present</button>
    </div>
  </header>;
}

function Canvas({ workspace, groups, cardById, focusIds, onSelect, onMove }: { workspace: WorkspaceState; groups: WorkspaceObject[]; cardById: Map<string, WorkspaceObject>; focusIds: string[]; onSelect: (id: string) => void; onMove: (id: string, x: number, y: number) => void }) {
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
    {groups.map((group) => <Group key={group.id} group={group} objects={workspace.objects.filter((object) => object.groupId === group.id)} selectedId={workspace.selectedId} focusIds={focusIds} onSelect={onSelect} onMove={onMove} />)}
    {workspace.objects.filter((object) => !object.groupId && object.type !== "group").map((object) => <CanvasCard key={object.id} object={object} selected={object.id === workspace.selectedId} focused={focusIds.includes(object.id)} onSelect={onSelect} onMove={onMove} />)}
  </div>;
}

function Group({ group, objects, selectedId, focusIds, onSelect, onMove }: { group: WorkspaceObject; objects: WorkspaceObject[]; selectedId: string; focusIds: string[]; onSelect: (id: string) => void; onMove: (id: string, x: number, y: number) => void }) {
  return <section className="group" style={{ left: `${(group.x / 920) * 100}%`, top: `${(group.y / 780) * 100}%` }}>
    <div className="group-title"><span>{groupIcon[group.title] ?? "✦"}</span><strong>{group.title}</strong><em>{objects.length} objects</em></div>
    <div className="group-stack">{objects.map((object) => <CanvasCard key={object.id} object={object} selected={object.id === selectedId} focused={focusIds.includes(object.id)} onSelect={onSelect} onMove={onMove} withinGroup />)}</div>
  </section>;
}

function CanvasCard({ object, selected, focused, onSelect, onMove, withinGroup = false }: { object: WorkspaceObject; selected: boolean; focused: boolean; onSelect: (id: string) => void; onMove: (id: string, x: number, y: number) => void; withinGroup?: boolean }) {
  const Icon = typeIcon[object.type];
  const drag = useRef<{ x: number; y: number; active: boolean }>({ x: 0, y: 0, active: false });
  const onPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => { drag.current = { x: event.clientX, y: event.clientY, active: false }; event.currentTarget.setPointerCapture(event.pointerId); };
  const onPointerMove = (event: React.PointerEvent<HTMLButtonElement>) => { if (Math.abs(event.clientX - drag.current.x) + Math.abs(event.clientY - drag.current.y) > 6) drag.current.active = true; };
  const onPointerUp = (event: React.PointerEvent<HTMLButtonElement>) => { if (drag.current.active && !withinGroup) onMove(object.id, object.x + event.clientX - drag.current.x, object.y + event.clientY - drag.current.y); else onSelect(object.id); };
  const decision = object.type === "decision";
  return <button className={`canvas-card ${decision ? "decision-card" : ""} ${selected ? "selected" : ""} ${focused ? "focused" : ""} ${object.locked ? "locked" : ""}`} style={withinGroup ? undefined : { left: `${(object.x / 920) * 100}%`, top: `${(object.y / 780) * 100}%` }} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
    <span className="card-icon"><Icon size={16} strokeWidth={1.7} /></span>
    <span className="card-copy"><strong>{object.title}</strong>{object.content && <small>{object.content}</small>}{object.priority && <small className="card-meta">{object.priority === "high" ? "P1" : "P2"} · {object.modifiedBy === "agent" ? "Agent updated" : "Human created"}</small>}</span>
    {object.locked && <LockKeyhole className="card-lock" size={15} />}
    {decision && <span className="decision-chip">Needs decision</span>}
  </button>;
}

function CanvasControls({ onRun, isRunning, onAdd }: { onRun: () => void; isRunning: boolean; onAdd: () => void }) {
  return <><div className="canvas-tools"><button title="Add shared note" onClick={onAdd}><Plus size={18} /> Add note</button></div><button className="agent-demo-trigger" onClick={onRun} disabled={isRunning}><Bot size={17} />{isRunning ? "Agent is organizing…" : "Preview safe agent action"}</button></>;
}

function Inspector({ selected, workspace, trace, showTrace, onTraceClick, onToggleTrace, onUpdate, onAccept, onReject, onPermissions, showActivity }: { selected: WorkspaceObject; workspace: WorkspaceState; trace: ToolTraceEvent[]; showTrace: boolean; focusIds: string[]; onTraceClick: (event: ToolTraceEvent) => void; onToggleTrace: () => void; onUpdate: (id: string, patch: Partial<WorkspaceObject>) => void; onAccept: () => void; onReject: () => void; onPermissions: () => void; showActivity: boolean }) {
  const proposal = workspace.proposal;
  return <aside className="inspector v2-inspector">
    <div className="inspector-tabs"><button className={!showTrace ? "active" : ""} onClick={onToggleTrace}><Pencil size={14} />Object</button><button className={showTrace ? "active" : ""} onClick={onToggleTrace}><ScanSearch size={14} />Agent trace</button></div>
    {showTrace ? <TracePanel trace={trace} onSelect={onTraceClick} /> : <>
    <div className="inspector-top"><span className="inspector-kind"><Sparkles size={15} /> {selected.type}</span><button><MoreHorizontal size={18} /></button></div>
    <div className="inspector-title"><h2>{selected.title}</h2><p>{selected.content}</p><span className={selected.status === "confirmed" ? "state-chip confirmed" : "state-chip"}>{selected.status === "confirmed" ? "Human confirmed" : "Agent proposal"}</span></div>
    <InlineEditor selected={selected} onUpdate={onUpdate} />
    {proposal?.status === "pending" && selected.type === "decision" ? <Proposal proposal={proposal} onAccept={onAccept} onReject={onReject} /> : <DecisionDetails selected={selected} onPermissions={onPermissions} />}
    {showActivity && <ActivityPanel events={workspace.activity} />}
    </>}
  </aside>;
}

function InlineEditor({ selected, onUpdate }: { selected: WorkspaceObject; onUpdate: (id: string, patch: Partial<WorkspaceObject>) => void }) {
  const [editing, setEditing] = useState(false); const [title, setTitle] = useState(selected.title); const [content, setContent] = useState(selected.content ?? "");
  useEffect(() => { setTitle(selected.title); setContent(selected.content ?? ""); setEditing(false); }, [selected.id, selected.title, selected.content]);
  if (!editing) return <button className="inline-edit" onClick={() => setEditing(true)}><Pencil size={14} /> Edit shared object</button>;
  return <section className="inline-editor"><label>Title<input value={title} onChange={(event) => setTitle(event.target.value)} /></label><label>Detail<textarea value={content} onChange={(event) => setContent(event.target.value)} /></label><div><button onClick={() => { onUpdate(selected.id, { title, content }); setEditing(false); }}><Check size={14} />Save</button><button onClick={() => setEditing(false)}>Cancel</button></div></section>;
}

function TracePanel({ trace, onSelect }: { trace: ToolTraceEvent[]; onSelect: (event: ToolTraceEvent) => void }) {
  const starter: ToolTraceEvent[] = [
    { id: "starter-1", tool: "inspect_workspace", summary: "Reads groups, permissions, and unresolved decisions without changing the canvas.", at: "ready", outcome: "success" },
    { id: "starter-2", tool: "get_objects", summary: "Reads the exact structured objects the human sees on the shared canvas.", objectIds: ["beta-feedback", "launch-date"], at: "ready", outcome: "success" },
  ];
  const events = trace.length ? trace : starter;
  return <section className="trace-panel"><div className="trace-heading"><div><span>Agent trace</span><p>{trace.length ? "Live calls and human decisions" : "Start the guided collaboration to watch the handoff."}</p></div><Radio size={17} /></div><div className="trace-list">{events.map((event, index) => <button key={event.id} className={`trace-event ${event.outcome}`} onClick={() => onSelect(event)}><span className="trace-number">{index + 1}</span><div><b>{event.tool}</b><p>{event.summary}</p><small>{event.at}</small></div><ChevronRight size={15} /></button>)}</div><div className="trace-foot"><CircleCheckBig size={15} />Every action is attributable and reviewable.</div></section>;
}

function Proposal({ proposal, onAccept, onReject }: { proposal: NonNullable<WorkspaceState["proposal"]>; onAccept: () => void; onReject: () => void }) {
  return <section className="proposal"><div className="proposal-heading"><span>Agent proposal</span><b>{proposal.confidence}% confidence</b></div><h3>{proposal.summary}</h3><p>{proposal.reason}</p><div className="proposal-impact">{proposal.changes.map((change) => <div key={change}><ArrowLeftRight size={14} />{change}</div>)}</div><button className="accept-button" onClick={onAccept}><Check size={16} />Accept all</button><button className="outline-action"><Grip size={16} />Modify</button><button className="outline-action reject" onClick={onReject}><X size={16} />Reject</button></section>;
}

function DecisionDetails({ selected, onPermissions }: { selected: WorkspaceObject; onPermissions: () => void }) {
  return <section className="detail-list"><div><span>Type</span><b>{selected.type}</b></div>{selected.status && <div><span>Status</span><b>{selected.status === "confirmed" ? "Confirmed" : selected.status.replace("_", " ")}</b></div>}{selected.confidence !== undefined && <div><span>Confidence</span><b>{selected.confidence}%</b></div>}{selected.locked && <div><span>Human lock</span><b>Protected</b></div>}<div><span>Created by</span><b>{selected.createdBy === "agent" ? "Commonplace Agent" : "Ezra"}</b></div><div><span>Last modified by</span><b>{selected.modifiedBy === "agent" ? "Commonplace Agent" : "Ezra"}</b></div><button className="permission-link" onClick={onPermissions}><LockKeyhole size={15} /> View agent access</button></section>;
}

function ActivityPanel({ events }: { events: ActivityEvent[] }) {
  return <section className="activity-panel"><div className="activity-title"><span><Bot size={16} />Commonplace Agent</span><i>Active</i></div>{events.slice(-5).reverse().map((event) => <div className="activity-event" key={event.id}><Clock3 size={14} /><div><p>{event.text}</p><small>{event.actor === "human" ? "You" : "Agent"} · {event.at}</small></div></div>)}</section>;
}

function Permissions({ workspace, onToggle, onClose }: { workspace: WorkspaceState; onToggle: (key: keyof WorkspaceState["permissions"]) => void; onClose: () => void }) {
  const entries = [["Read workspace", "read"], ["Create objects", "create"], ["Modify unlocked objects", "modify"], ["Reorganize canvas", "reorganize"], ["Connect objects", "connect"], ["Delete objects", "delete"]] as const;
  return <div className="modal-backdrop" onMouseDown={onClose}><section className="permissions-modal" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" onClick={onClose}><X size={19} /></button><span className="modal-icon"><LockKeyhole size={20} /></span><h2>Commonplace access</h2><p>Agents receive explicit capabilities. Destructive changes stay human-controlled.</p><div className="permission-list">{entries.map(([label, key]) => <button key={key} onClick={() => onToggle(key)}><span>{label}</span><b className={workspace.permissions[key] ? "allowed" : "denied"}>{workspace.permissions[key] ? "Allowed" : "Off"}</b></button>)}</div><button className="accept-button" onClick={onClose}>Done</button></section></div>;
}
