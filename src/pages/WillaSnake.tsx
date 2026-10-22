import { useEffect, useMemo, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { getSnakeScores, saveSnakeScore, type SnakeScore } from "../services/snake.service";

type Cell = { x: number; y: number };
const SIZE = 16;

const same = (a: Cell, b: Cell) => a.x === b.x && a.y === b.y;
const randomFood = (snake: Cell[]) => {
  let food = { x: Math.floor(Math.random() * SIZE), y: Math.floor(Math.random() * SIZE) };
  while (snake.some((part) => same(part, food))) {
    food = { x: Math.floor(Math.random() * SIZE), y: Math.floor(Math.random() * SIZE) };
  }
  return food;
};

export default function WillaSnake() {
  const [snake, setSnake] = useState<Cell[]>([{ x: 8, y: 8 }]);
  const [food, setFood] = useState<Cell>({ x: 5, y: 5 });
  const [dir, setDir] = useState<Cell>({ x: 1, y: 0 });
  const [running, setRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [scores, setScores] = useState<SnakeScore[]>([]);
  const [scoresLoading, setScoresLoading] = useState(true);
  const [scoresError, setScoresError] = useState("");
  const dirRef = useRef(dir);
  const scoreSubmittedRef = useRef(false);
  const score = snake.length - 1;

  useEffect(() => {
    let cancelled = false;

    getSnakeScores()
      .then((data) => {
        if (!cancelled) setScores(data);
      })
      .catch(() => {
        if (!cancelled) setScoresError("No se pudo cargar la tabla global.");
      })
      .finally(() => {
        if (!cancelled) setScoresLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    dirRef.current = dir;
  }, [dir]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const next = {
        ArrowUp: { x: 0, y: -1 },
        ArrowDown: { x: 0, y: 1 },
        ArrowLeft: { x: -1, y: 0 },
        ArrowRight: { x: 1, y: 0 },
      }[event.key];
      if (!next) return;
      event.preventDefault();
      if (next.x + dirRef.current.x || next.y + dirRef.current.y) setDir(next);
      setRunning(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!running || gameOver) return;
    const id = window.setInterval(() => {
      setSnake((current) => {
        const head = { x: current[0].x + dirRef.current.x, y: current[0].y + dirRef.current.y };
        const crashed = head.x < 0 || head.y < 0 || head.x >= SIZE || head.y >= SIZE || current.some((part) => same(part, head));
        if (crashed) {
          setRunning(false);
          setGameOver(true);
          if (!scoreSubmittedRef.current) {
            scoreSubmittedRef.current = true;
            void saveSnakeScore(current.length - 1)
              .then(setScores)
              .catch(() => setScoresError("No se pudo guardar el puntaje."));
          }
          return current;
        }
        const ate = same(head, food);
        const nextSnake = [head, ...current];
        if (!ate) nextSnake.pop();
        if (ate) setFood(randomFood(nextSnake));
        return nextSnake;
      });
    }, 130);
    return () => window.clearInterval(id);
  }, [food, gameOver, running]);

  const cells = useMemo(() => Array.from({ length: SIZE * SIZE }, (_, i) => ({ x: i % SIZE, y: Math.floor(i / SIZE) })), []);
  const reset = () => {
    const start = [{ x: 8, y: 8 }];
    setSnake(start);
    setFood(randomFood(start));
    setDir({ x: 1, y: 0 });
    setGameOver(false);
    setRunning(false);
    scoreSubmittedRef.current = false;
  };

  return (
    <div className="mx-auto grid max-w-5xl gap-4 lg:grid-cols-[minmax(320px,520px)_1fr]">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Willa Snake</h1>
            <p className="text-sm text-slate-500">Flechas para moverte. 4 clicks al logo para volver cuando quieras.</p>
          </div>
          <button onClick={reset} className="rounded-xl border border-slate-200 p-2 dark:border-slate-700"><RotateCcw size={18} /></button>
        </div>
        <div className="mb-3 flex gap-2">
          <button onClick={() => setRunning(true)} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Iniciar</button>
          <span className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold dark:bg-slate-900">Puntos: {score}</span>
          {gameOver && <span className="rounded-xl bg-red-100 px-4 py-2 text-sm font-bold text-red-700">Fin</span>}
        </div>
        <div className="grid aspect-square overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 dark:border-slate-800" style={{ gridTemplateColumns: `repeat(${SIZE}, 1fr)` }}>
          {cells.map((cell) => {
            const isSnake = snake.some((part) => same(part, cell));
            const isFood = same(food, cell);
            return <div key={`${cell.x}-${cell.y}`} className={`${isFood ? "bg-orange-400" : isSnake ? "bg-emerald-400" : "bg-slate-900"} border border-slate-800/60`} />;
          })}
        </div>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <h2 className="mb-3 text-lg font-bold text-slate-900 dark:text-white">Tabla de records</h2>
        <div className="space-y-2">
          {scoresLoading && <p className="text-sm text-slate-500">Cargando records...</p>}
          {!scoresLoading && scoresError && <p className="text-sm text-red-600">{scoresError}</p>}
          {!scoresLoading && !scoresError && scores.map((item, index) => (
            <div key={`${item.id}-${index}`} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm dark:bg-slate-900">
              <span className="font-semibold">{index + 1}. {item.name}</span>
              <span className="font-bold text-blue-600 dark:text-blue-300">{item.score}</span>
            </div>
          ))}
          {!scoresLoading && !scoresError && scores.length === 0 && <p className="text-sm text-slate-500">Aun no hay puntajes.</p>}
        </div>
      </section>
    </div>
  );
}
