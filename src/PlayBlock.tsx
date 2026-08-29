import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

type Point = { x: number; y: number };
type PlayPhase = "idle" | "held" | "human-throw" | "agent-catch" | "agent-return";
type AgentResponse = { catch: string; return: string; landing: number; arc: number; spin: number; duration: number };

const BLOCK_RADIUS = 24;
const MAX_SPEED = 1.35;
const AGENT_PLANS = [
  { catch: "Caught clean.", return: "High arc selected.", landing: 0.52, arc: 1.12, spin: 1, duration: 760 },
  { catch: "I have it.", return: "Soft bank, your side.", landing: 0.59, arc: 0.78, spin: -1, duration: 680 },
  { catch: "Timing locked.", return: "Long curve, light spin.", landing: 0.66, arc: 1.3, spin: 1, duration: 840 },
  { catch: "Tracked it.", return: "Quick low return.", landing: 0.55, arc: 0.62, spin: -1, duration: 610 },
  { catch: "Mine for a second.", return: "Float-back trajectory.", landing: 0.63, arc: 1.46, spin: 1, duration: 900 },
];

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/**
 * A deliberately local, non-semantic interaction. It does not know about
 * WorkspaceState, activity, permissions, or WebMCP, so play never mutates work.
 */
export function PlayBlock() {
  const stageRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);
  const timersRef = useRef<number[]>([]);
  const dragRef = useRef({ active: false, previous: { x: 0, y: 0, at: 0 }, velocity: { x: 0, y: 0 }, origin: { x: 0, y: 0 } });
  const velocityRef = useRef<Point>({ x: 0, y: 0 });
  const positionRef = useRef<Point>({ x: 120, y: 320 });
  const phaseRef = useRef<PlayPhase>("idle");
  const turnRef = useRef(0);
  const [position, setPosition] = useState<Point>(positionRef.current);
  const [rotation, setRotation] = useState(0);
  const [phase, setPhase] = useState<PlayPhase>("idle");
  const [message, setMessage] = useState("A small play block — grab and throw it.");

  const setPlayPhase = (next: PlayPhase) => { phaseRef.current = next; setPhase(next); };

  const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const bounds = () => stageRef.current?.getBoundingClientRect();
  const keepInBounds = (point: Point) => {
    const rect = bounds();
    if (!rect) return point;
    return { x: clamp(point.x, BLOCK_RADIUS, rect.width - BLOCK_RADIUS), y: clamp(point.y, BLOCK_RADIUS, rect.height - BLOCK_RADIUS) };
  };
  const place = (point: Point) => {
    const next = keepInBounds(point);
    positionRef.current = next;
    setPosition(next);
  };
  const clearMotion = () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
  };
  const agentHand = () => {
    const rect = bounds();
    return rect ? { x: rect.width * 0.76, y: Math.max(74, rect.height * 0.23) } : positionRef.current;
  };
  const chooseAgentResponse = (): AgentResponse => {
    const turn = turnRef.current++;
    const momentum = Math.round((Math.abs(velocityRef.current.x) + Math.abs(velocityRef.current.y)) * 10);
    const plan = AGENT_PLANS[(turn * 3 + momentum) % AGENT_PLANS.length];
    return { ...plan, catch: `${plan.catch} Move ${turn + 1}.`, return: `Move ${turn + 1}: ${plan.return}` };
  };
  const returnSpot = (response: AgentResponse) => {
    const rect = bounds();
    if (!rect) return positionRef.current;
    const x = response.landing * rect.width;
    return { x, y: Math.min(rect.height - 88, Math.max(118, rect.height * 0.81)) };
  };
  const later = (callback: () => void, delay: number) => {
    const timer = window.setTimeout(() => {
      timersRef.current = timersRef.current.filter((item) => item !== timer);
      callback();
    }, delay);
    timersRef.current.push(timer);
  };

  const returnFromAgent = (response: AgentResponse) => {
    const start = positionRef.current;
    const end = keepInBounds(returnSpot(response));
    const duration = reducedMotion() ? 160 : response.duration;
    const startedAt = performance.now();
    const arc = Math.min(150, Math.max(66, Math.abs(end.x - start.x) * 0.31 * response.arc));
    setPlayPhase("agent-return");
    setMessage(response.return);
    const animate = (now: number) => {
      const raw = clamp((now - startedAt) / duration, 0, 1);
      const eased = 1 - Math.pow(1 - raw, 3);
      const point = { x: start.x + (end.x - start.x) * eased, y: start.y + (end.y - start.y) * eased - Math.sin(raw * Math.PI) * arc };
      place(point);
      setRotation(response.spin * raw * (300 + response.arc * 100));
      if (raw < 1) frameRef.current = requestAnimationFrame(animate);
      else {
        frameRef.current = null;
        place(end);
        setRotation(0);
        setPlayPhase("idle");
        setMessage("Your turn. Grab the block and send it back.");
      }
    };
    frameRef.current = requestAnimationFrame(animate);
  };

  const catchByAgent = () => {
    if (phaseRef.current === "held") return;
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    const response = chooseAgentResponse();
    setPlayPhase("agent-catch");
    setMessage(response.catch);
    place(agentHand());
    setRotation(0);
    later(() => returnFromAgent(response), reducedMotion() ? 120 : 360);
  };

  const launchHumanThrow = () => {
    const velocity = velocityRef.current;
    const startedAt = performance.now();
    let lastAt = startedAt;
    setPlayPhase("human-throw");
    setMessage("The agent is tracking it…");
    const tick = (now: number) => {
      const dt = Math.min(now - lastAt, 28);
      lastAt = now;
      const rect = bounds();
      if (!rect) return;
      const next = { x: positionRef.current.x + velocity.x * dt, y: positionRef.current.y + velocity.y * dt };
      velocity.y += 0.0014 * dt;
      if (next.x < BLOCK_RADIUS || next.x > rect.width - BLOCK_RADIUS) {
        next.x = clamp(next.x, BLOCK_RADIUS, rect.width - BLOCK_RADIUS);
        velocity.x *= -0.74;
      }
      if (next.y < BLOCK_RADIUS || next.y > rect.height - BLOCK_RADIUS) {
        next.y = clamp(next.y, BLOCK_RADIUS, rect.height - BLOCK_RADIUS);
        velocity.y *= -0.67;
      }
      place(next);
      setRotation((current) => current + velocity.x * 10);
      if (now - startedAt < (reducedMotion() ? 120 : 640)) frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    later(catchByAgent, reducedMotion() ? 140 : 680);
  };

  const pointFromEvent = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const rect = bounds();
    return rect ? keepInBounds({ x: event.clientX - rect.left, y: event.clientY - rect.top }) : positionRef.current;
  };
  const onPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    clearMotion();
    const point = pointFromEvent(event);
    dragRef.current = { active: true, previous: { ...point, at: performance.now() }, velocity: { x: 0, y: 0 }, origin: point };
    event.currentTarget.setPointerCapture(event.pointerId);
    setPlayPhase("held");
    setMessage("Held. Give it a throw.");
    place(point);
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!dragRef.current.active) return;
    const point = pointFromEvent(event);
    const now = performance.now();
    const elapsed = Math.max(1, now - dragRef.current.previous.at);
    dragRef.current.velocity = {
      x: clamp((point.x - dragRef.current.previous.x) / elapsed, -MAX_SPEED, MAX_SPEED),
      y: clamp((point.y - dragRef.current.previous.y) / elapsed, -MAX_SPEED, MAX_SPEED),
    };
    dragRef.current.previous = { ...point, at: now };
    place(point);
    setRotation((current) => current * 0.68 + dragRef.current.velocity.x * 9);
  };
  const release = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!dragRef.current.active) return;
    dragRef.current.active = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    const moved = Math.hypot(positionRef.current.x - dragRef.current.origin.x, positionRef.current.y - dragRef.current.origin.y);
    velocityRef.current = moved < 7 ? { x: 0.46, y: -0.92 } : { x: dragRef.current.velocity.x * 1.12, y: dragRef.current.velocity.y * 1.12 };
    launchHumanThrow();
  };

  useEffect(() => {
    const resize = () => {
      const rect = bounds();
      if (!rect) return;
      if (positionRef.current.y === 320) place({ x: Math.min(118, rect.width * 0.17), y: rect.height - 88 });
      else place(positionRef.current);
    };
    resize();
    const observer = new ResizeObserver(resize);
    if (stageRef.current) observer.observe(stageRef.current);
    return () => { observer.disconnect(); clearMotion(); };
  }, []);

  return <div ref={stageRef} className="play-block-stage" aria-label="Play area, separate from shared workspace objects">
    <div className="play-block-status" aria-live="polite">{message}</div>
    <button
      type="button"
      className={`play-block ${phase}`}
      style={{ left: position.x, top: position.y, "--block-rotation": `${rotation}deg` } as React.CSSProperties}
      aria-label="Play block. Grab, drag, and throw it; the agent will catch and return it."
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={release}
      onPointerCancel={release}
    >
      <span className="play-block-face" />
      <span className="play-block-shadow" />
    </button>
  </div>;
}
