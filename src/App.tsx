import { useCallback, useEffect, useMemo, useRef, useState, type SetStateAction } from "react";
import { ArrowLeftRight, Bot, Check, ChevronDown, CircleHelp, Clock3, FileText, Grip, Hand, History, LayoutGrid, LockKeyhole, MoreHorizontal, MousePointer2, Network, Play, Plus, Search, Settings, Sparkles, Undo2, X } from "lucide-react";
import { workspaceActions } from "./actions";
import { createAuroraWorkspace, createResearchWorkspace } from "./data";
import type { ActivityEvent, WorkspaceObject, WorkspaceState } from "./types";
import { registerCommonplaceTools } from "./webmcp";

const typeIcon = { note: FileText, task: Check, decision: Sparkles, group: LayoutGrid, heading: FileText };
const groupIcon = { Product: "✦", Research: "◌", Marketing: "↗", Operations: "◈" } as Record<string, string>;
type WorkspaceExample = "aurora" | "research";

export function App() {
  const [home, setHome] = useState(true);
  const [example, setExample] = useState<WorkspaceExample>("aurora");
  const [workspace, setWorkspace] = useState<WorkspaceState>(() => createAuroraWorkspace());
  const [showActivity, setShowActivity] = useState(true);
  const [showPermissions, setShowPermissions] = useState(false);
  const [showPresent, setShowPresent] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
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

  useEffect(() => registerCommonplaceTools(() => latest.current, applyWorkspace), [applyWorkspace]);

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

  const switchExample = (next: WorkspaceExample) => { setExample(next); undoStack.current = []; setCanUndo(false); setWorkspace(next === "aurora" ? createAuroraWorkspace() : createResearchWorkspace()); setHome(false); };
  const reset = () => { undoStack.current = []; setCanUndo(false); setWorkspace(example === "aurora" ? createAuroraWorkspace() : createResearchWorkspace()); };

  if (home) return <Landing onOpen={switchExample} />;

  return <main className={`app-shell ${showPresent ? "presenting" : ""}`}>
    {!showPresent && <Sidebar onReset={reset} onUndo={undo} canUndo={canUndo} />}
    <section className="workspace-shell">
      {!showPresent && <Header name={workspace.name} status={workspace.agentStatus} onPresent={() => setShowPresent(true)} onActivity={() => setShowActivity((value) => !value)} onSwitch={() => switchExample(example === "aurora" ? "research" : "aurora")} />}
      <div className="workspace-body">
        <Canvas workspace={workspace} groups={groups} cardById={cardById} onSelect={(id) => applyWorkspace((current) => workspaceActions.select(current, id))} onMove={(id, x, y) => applyWorkspace((current) => workspaceActions.moveObjects(current, [{ id, x, y }], "human"))} />
        {showPresent && <button className="exit-present" onClick={() => setShowPresent(false)}><X size={16} /> Exit present mode</button>}
        {!showPresent && <CanvasControls onRun={runAgent} isRunning={isRunning} />}
      </div>
    </section>
    {!showPresent && <Inspector selected={selected} workspace={workspace} onAccept={() => applyWorkspace((current) => workspaceActions.acceptProposal(current))} onReject={() => applyWorkspace((current) => workspaceActions.rejectProposal(current))} onPermissions={() => setShowPermissions(true)} showActivity={showActivity} />}
    {showPermissions && <Permissions workspace={workspace} onClose={() => setShowPermissions(false)} />}
  </main>;
}

function Landing({ onOpen }: { onOpen: (example: WorkspaceExample) => void }) {
  return <main className="landing">
    <header className="landing-nav"><div className="brand"><span className="brand-mark" /><strong>Commonplace</strong></div><nav><button>Workspaces</button><button>Templates</button><button className="landing-open" onClick={() => onOpen("aurora")}>Open workspace <ArrowLeftRight size={15} /></button></nav></header>
    <section className="landing-hero"><div className="landing-copy"><h1>One place for humans and agents to work together.</h1><p>Humans have interfaces. Agents have APIs. Commonplace gives them a shared workspace.</p><div className="hero-actions"><button className="hero-primary" onClick={() => onOpen("aurora")}><Play size={15} fill="currentColor" />Open Project Aurora</button><button className="hero-link" onClick={() => onOpen("research")}>Explore Research Board <ArrowLeftRight size={16} /></button></div></div><div className="landing-preview" aria-label="Commonplace workspace preview"><div className="preview-bar"><span className="brand-mark" />Project Aurora Launch <span className="preview-status"><i />Agent connected</span></div><div className="preview-canvas"><div className="mini-group product"><b>✦ Product</b><span>Fix signup bug</span><span>Improve onboarding</span></div><div className="mini-group research"><b>◌ Research</b><span>Beta feedback</span><span>Customer interviews</span></div><div className="mini-decision"><Sparkles size={16} /><b>Launch date</b><strong>October 14?</strong><small>Needs decision</small></div><div className="mini-line line-one" /><div className="mini-line line-two" /><div className="mini-agent"><b>Commonplace Agent</b><span>Requested a human decision</span></div></div></div></section>
    <section className="shared-statement"><div><span>Human</span><p>Click, drag, write, decide.</p></div><div className="statement-center"><span>Commonplace</span><p>Shared semantic objects.</p></div><div><span>Agent</span><p>Inspect, organize, transform.</p></div></section>
  </main>;
}

function Sidebar({ onReset, onUndo, canUndo }: { onReset: () => void; onUndo: () => void; canUndo: boolean }) {
  const primary = [{ icon: LayoutGrid, label: "Canvas", active: true }, { icon: Search, label: "Search" }, { icon: FileText, label: "Notes" }, { icon: Check, label: "Tasks" }, { icon: Bot, label: "Agents" }, { icon: Network, label: "Activity" }];
  return <aside className="sidebar">
    <div className="brand"><span className="brand-mark" /> <strong>Commonplace</strong></div>
    <nav>{primary.map(({ icon: Icon, label, active }) => <button key={label} className={active ? "nav-item active" : "nav-item"}><Icon size={17} strokeWidth={1.65} /> {label}</button>)}</nav>
    <div className="nav-spacer" />
    <button className="nav-item" onClick={onUndo} disabled={!canUndo}><Undo2 size={17} strokeWidth={1.65} /> Undo last change</button>
    <button className="nav-item" onClick={onReset}><Undo2 size={17} strokeWidth={1.65} /> Reset demo</button>
    <button className="nav-item"><Settings size={17} strokeWidth={1.65} /> Settings</button>
    <button className="nav-item"><CircleHelp size={17} strokeWidth={1.65} /> Help</button>
  </aside>;
}

function Header({ name, status, onPresent, onActivity, onSwitch }: { name: string; status: WorkspaceState["agentStatus"]; onPresent: () => void; onActivity: () => void; onSwitch: () => void }) {
  const copy = status === "working" ? "Agent working" : status === "waiting" ? "Waiting on you" : "Agent connected";
  return <header className="workspace-header">
    <button className="workspace-name" onClick={onSwitch}>{name} <ChevronDown size={16} /></button>
    <div className="header-right">
      <div className="avatars"><span>EZ</span><span>AL</span><span>MK</span></div>
      <div className={`agent-status ${status}`}><i />{copy}</div>
      <button className="chrome-button" onClick={onActivity}><History size={16} />History</button>
      <button className="present-button" onClick={onPresent}><Play size={15} fill="currentColor" />Present</button>
    </div>
  </header>;
}

function Canvas({ workspace, groups, cardById, onSelect, onMove }: { workspace: WorkspaceState; groups: WorkspaceObject[]; cardById: Map<string, WorkspaceObject>; onSelect: (id: string) => void; onMove: (id: string, x: number, y: number) => void }) {
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
    {groups.map((group) => <Group key={group.id} group={group} objects={workspace.objects.filter((object) => object.groupId === group.id)} selectedId={workspace.selectedId} onSelect={onSelect} onMove={onMove} />)}
    {workspace.objects.filter((object) => !object.groupId && object.type !== "group").map((object) => <CanvasCard key={object.id} object={object} selected={object.id === workspace.selectedId} onSelect={onSelect} onMove={onMove} />)}
  </div>;
}

function Group({ group, objects, selectedId, onSelect, onMove }: { group: WorkspaceObject; objects: WorkspaceObject[]; selectedId: string; onSelect: (id: string) => void; onMove: (id: string, x: number, y: number) => void }) {
  return <section className="group" style={{ left: `${(group.x / 920) * 100}%`, top: `${(group.y / 780) * 100}%` }}>
    <div className="group-title"><span>{groupIcon[group.title] ?? "✦"}</span><strong>{group.title}</strong><em>{objects.length} objects</em></div>
    <div className="group-stack">{objects.map((object) => <CanvasCard key={object.id} object={object} selected={object.id === selectedId} onSelect={onSelect} onMove={onMove} withinGroup />)}</div>
  </section>;
}

function CanvasCard({ object, selected, onSelect, onMove, withinGroup = false }: { object: WorkspaceObject; selected: boolean; onSelect: (id: string) => void; onMove: (id: string, x: number, y: number) => void; withinGroup?: boolean }) {
  const Icon = typeIcon[object.type];
  const drag = useRef<{ x: number; y: number; active: boolean }>({ x: 0, y: 0, active: false });
  const onPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => { drag.current = { x: event.clientX, y: event.clientY, active: false }; event.currentTarget.setPointerCapture(event.pointerId); };
  const onPointerMove = (event: React.PointerEvent<HTMLButtonElement>) => { if (Math.abs(event.clientX - drag.current.x) + Math.abs(event.clientY - drag.current.y) > 6) drag.current.active = true; };
  const onPointerUp = (event: React.PointerEvent<HTMLButtonElement>) => { if (drag.current.active && !withinGroup) onMove(object.id, object.x + event.clientX - drag.current.x, object.y + event.clientY - drag.current.y); else onSelect(object.id); };
  const decision = object.type === "decision";
  return <button className={`canvas-card ${decision ? "decision-card" : ""} ${selected ? "selected" : ""} ${object.locked ? "locked" : ""}`} style={withinGroup ? undefined : { left: `${(object.x / 920) * 100}%`, top: `${(object.y / 780) * 100}%` }} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
    <span className="card-icon"><Icon size={16} strokeWidth={1.7} /></span>
    <span className="card-copy"><strong>{object.title}</strong>{object.content && <small>{object.content}</small>}{object.priority && <small className="card-meta">{object.priority === "high" ? "P1" : "P2"} · {object.modifiedBy === "agent" ? "Agent updated" : "Human created"}</small>}</span>
    {object.locked && <LockKeyhole className="card-lock" size={15} />}
    {decision && <span className="decision-chip">Needs decision</span>}
  </button>;
}

function CanvasControls({ onRun, isRunning }: { onRun: () => void; isRunning: boolean }) {
  return <><div className="canvas-tools"><button title="Select"><MousePointer2 size={17} /></button><button title="Pan"><Hand size={17} /></button><button title="Add"><Plus size={18} /></button><button title="Connect"><Network size={17} /></button></div><div className="zoom-control"><button>−</button><span>100%</span><button>+</button></div><button className="agent-demo-trigger" onClick={onRun} disabled={isRunning}><Bot size={17} />{isRunning ? "Agent is organizing…" : "Run agent collaboration"}</button></>;
}

function Inspector({ selected, workspace, onAccept, onReject, onPermissions, showActivity }: { selected: WorkspaceObject; workspace: WorkspaceState; onAccept: () => void; onReject: () => void; onPermissions: () => void; showActivity: boolean }) {
  const proposal = workspace.proposal;
  return <aside className="inspector">
    <div className="inspector-top"><span className="inspector-kind"><Sparkles size={15} /> {selected.type}</span><button><MoreHorizontal size={18} /></button></div>
    <div className="inspector-title"><h2>{selected.title}</h2><p>{selected.content}</p><span className={selected.status === "confirmed" ? "state-chip confirmed" : "state-chip"}>{selected.status === "confirmed" ? "Human confirmed" : "Agent proposal"}</span></div>
    {proposal?.status === "pending" && selected.type === "decision" ? <Proposal proposal={proposal} onAccept={onAccept} onReject={onReject} /> : <DecisionDetails selected={selected} onPermissions={onPermissions} />}
    {showActivity && <ActivityPanel events={workspace.activity} />}
  </aside>;
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

function Permissions({ workspace, onClose }: { workspace: WorkspaceState; onClose: () => void }) {
  const entries = [["Read workspace", "read"], ["Create objects", "create"], ["Modify unlocked objects", "modify"], ["Reorganize canvas", "reorganize"], ["Connect objects", "connect"], ["Delete objects", "delete"]] as const;
  return <div className="modal-backdrop" onMouseDown={onClose}><section className="permissions-modal" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" onClick={onClose}><X size={19} /></button><span className="modal-icon"><LockKeyhole size={20} /></span><h2>Commonplace access</h2><p>Agents receive explicit capabilities. Destructive changes stay human-controlled.</p><div className="permission-list">{entries.map(([label, key]) => <div key={key}><span>{label}</span><b className={workspace.permissions[key] ? "allowed" : "denied"}>{workspace.permissions[key] ? "Allowed" : "Off"}</b></div>)}</div><button className="accept-button" onClick={onClose}>Done</button></section></div>;
}
