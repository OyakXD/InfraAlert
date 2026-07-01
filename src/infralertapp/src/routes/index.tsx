import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import mqtt, { type MqttClient } from "mqtt";
import { Shield, Radio, Bell, Trash2, ShieldCheck, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { getMqttConfig, type PublicMqttConfig } from "@/lib/mqtt-config.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Infralert — Monitoramento e alertas em tempo real" },
      { name: "description", content: "Receba notificações importantes em tempo real do sistema monitorado via MQTT." },
      { property: "og:title", content: "Infralert" },
      { property: "og:description", content: "Monitoramento de segurança e alertas em tempo real." },
    ],
  }),
  component: InfralertApp,
});

type Tab = "home" | "alerts";

type Notif = {
  id: string;
  topic: string;
  message: string;
  at: number;
  level: "info" | "warning" | "critical";
};

const STORAGE_NOTIFS = "infralert.notifs";

function createNotifId() {
  return globalThis.crypto?.randomUUID?.() ?? `notif_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function loadNotifs(): Notif[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_NOTIFS);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function detectLevel(msg: string): Notif["level"] {
  const m = msg.toLowerCase();
  if (/(critical|crítico|critico|emerg|fire|invasão|invasao)/.test(m)) return "critical";
  if (/(warn|alerta|aviso|atenção|atencao)/.test(m)) return "warning";
  return "info";
}

function InfralertApp() {
  const [tab, setTab] = useState<Tab>("home");
  const [notifs, setNotifs] = useState<Notif[]>(loadNotifs);
  const [notifPerm, setNotifPerm] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "default",
  );
  const [isSecureContextState, setIsSecureContextState] = useState(true);
  const clientRef = useRef<MqttClient | null>(null);

  useEffect(() => {
    setIsSecureContextState(typeof window === "undefined" ? true : window.isSecureContext);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_NOTIFS, JSON.stringify(notifs.slice(0, 200)));
  }, [notifs]);

  function pushNotif(n: Notif) {
    setNotifs((prev) => [n, ...prev].slice(0, 200));
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      try {
        new Notification("Infralert — " + n.topic, {
          body: n.message,
          tag: n.id,
          icon: "/favicon.ico",
        });
      } catch {}
    }
  }

  // Connect once on mount using config from backend (env vars).
  useEffect(() => {
    let cancelled = false;
    let client: MqttClient | null = null;

    (async () => {
      let cfg: PublicMqttConfig;
      try {
        cfg = await getMqttConfig();
      } catch {
        return;
      }
      if (cancelled || !cfg.host || !cfg.port || !cfg.topic) return;
      const path = cfg.path && cfg.path !== "/" ? cfg.path : "/mqtt";
      const url = `wss://${cfg.host}:${cfg.port}`;

      try {
        const randomId = "infralert_" + Math.random().toString(16).substring(2, 10);

        client = mqtt.connect(url, {
          clientId: randomId,
          path,
          reconnectPeriod: 4000,
          connectTimeout: 10000,
          clean: true,
          username: cfg.username,
          password: cfg.password,
        });
        clientRef.current = client;
        client.on("connect", () => {
          client?.subscribe(cfg.topic, { qos: 0 });
        });
        client.on("message", (topic, payload) => {
          const msg = payload.toString();
          pushNotif({
            id: createNotifId(),
            topic,
            message: msg,
            at: Date.now(),
            level: detectLevel(msg),
          });
        });
      } catch {
        // silent — connection details are backend-managed
      }
    })();

    return () => {
      cancelled = true;
      try { client?.end(true); } catch {}
      clientRef.current = null;
    };
  }, []);

  async function requestNotifPerm() {
    if (typeof Notification === "undefined") return;
    const p = await Notification.requestPermission();
    setNotifPerm(p);
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-background">
      <main className="flex-1 overflow-y-auto pb-24">
        {tab === "home" && <HomeScreen onStart={() => setTab("alerts")} />}
        {tab === "alerts" && (
          <AlertsScreen
            notifs={notifs}
            onClear={() => setNotifs([])}
            onDelete={(id) => setNotifs((p) => p.filter((n) => n.id !== id))}
            notifPerm={notifPerm}
            isSecureContext={isSecureContextState}
            requestNotifPerm={requestNotifPerm}
          />
        )}
      </main>
      <BottomNav tab={tab} setTab={setTab} unread={notifs.length} />
    </div>
  );
}

function HomeScreen({ onStart }: { onStart: () => void }) {
  return (
    <section className="flex min-h-[calc(100vh-6rem)] flex-col items-center justify-between p-6 text-center">
      <div className="pt-12">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-3xl bg-primary/15 ring-1 ring-primary/30">
          <Shield className="h-12 w-12 text-primary" strokeWidth={1.8} />
        </div>
        <h1 className="mt-6 text-4xl font-bold tracking-tight">Infralert</h1>
        <p className="mt-1 text-sm uppercase tracking-[0.2em] text-muted-foreground">Security Monitor</p>
      </div>

      <div className="my-8 space-y-4 text-left">
        <p className="text-pretty text-base leading-relaxed text-foreground/90">
          Monitoramento de segurança e alertas em tempo real. Receba notificações
          importantes do sistema monitorado.
        </p>
        <ul className="space-y-3 text-sm text-muted-foreground">
          <li className="flex items-start gap-3">
            <Radio className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            Conexão automática ao broker
          </li>
          <li className="flex items-start gap-3">
            <Bell className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            Notificações fora do aplicativo
          </li>
          <li className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            Histórico de alertas recebidos
          </li>
        </ul>
      </div>

      <button
        onClick={onStart}
        className="w-full rounded-2xl bg-primary px-6 py-4 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition hover:brightness-110 active:scale-[0.98]"
      >
        Ver notificações
      </button>
    </section>
  );
}

function NotifCard({ n, onDelete }: { n: Notif; onDelete?: () => void }) {
  const levelStyle = {
    info: "ring-primary/20 bg-card",
    warning: "ring-[var(--warning)]/30 bg-[var(--warning)]/5",
    critical: "ring-destructive/30 bg-destructive/5",
  }[n.level];
  const Icon = n.level === "critical" ? AlertTriangle : n.level === "warning" ? AlertTriangle : ShieldCheck;
  const iconColor =
    n.level === "critical" ? "text-destructive" : n.level === "warning" ? "text-[var(--warning)]" : "text-primary";

  return (
    <li className={`rounded-xl p-3 ring-1 ${levelStyle}`}>
      <div className="flex items-start gap-3">
        <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${iconColor}`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="truncate text-xs font-semibold text-foreground/80">{n.topic}</p>
            <time className="shrink-0 text-[10px] text-muted-foreground">
              {new Date(n.at).toLocaleTimeString()}
            </time>
          </div>
          <p className="mt-0.5 break-words text-sm text-foreground">{n.message}</p>
        </div>
        {onDelete && (
          <button onClick={onDelete} className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Remover">
            <XCircle className="h-4 w-4" />
          </button>
        )}
      </div>
    </li>
  );
}

function AlertsScreen(props: {
  notifs: Notif[];
  onClear: () => void;
  onDelete: (id: string) => void;
  notifPerm: NotificationPermission;
  isSecureContext: boolean;
  requestNotifPerm: () => void;
}) {
  const { notifs, onClear, onDelete, notifPerm, isSecureContext, requestNotifPerm } = props;
  const canRequestNotifications = isSecureContext && typeof Notification !== "undefined";
  return (
    <section className="p-5">
      <header className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Notificações</h2>
          <p className="text-xs text-muted-foreground">{notifs.length} no histórico</p>
        </div>
        <button
          onClick={onClear}
          disabled={notifs.length === 0}
          className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground ring-1 ring-border transition hover:bg-secondary/80 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Limpar
        </button>
      </header>

      <div className="mb-5 rounded-2xl bg-card p-4 ring-1 ring-border">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15">
            <Bell className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Notificações do sistema</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Receba alertas mesmo com o aplicativo em segundo plano.
            </p>
          </div>
          {notifPerm === "granted" ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--success)]/15 px-2.5 py-1 text-[10px] font-medium text-[var(--success)] ring-1 ring-[var(--success)]/30">
              <CheckCircle2 className="h-3 w-3" /> Ativo
            </span>
          ) : (
            <button
              onClick={requestNotifPerm}
              disabled={!canRequestNotifications}
              className="shrink-0 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:brightness-110"
            >
              Ativar
            </button>
          )}
        </div>
        {!isSecureContext && (
          <p className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            O navegador bloqueia notificações porque esta página não está em um contexto seguro. Abra em HTTPS ou mantenha em localhost.
          </p>
        )}
        {isSecureContext && typeof Notification === "undefined" && (
          <p className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            Este navegador não oferece suporte à API de notificações.
          </p>
        )}
      </div>

      {notifs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center">
          <Bell className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">Nenhuma notificação ainda.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {notifs.map((n) => (
            <NotifCard key={n.id} n={n} onDelete={() => onDelete(n.id)} />
          ))}
        </ul>
      )}
    </section>
  );
}

function BottomNav({ tab, setTab, unread }: { tab: Tab; setTab: (t: Tab) => void; unread: number }) {
  const items: { id: Tab; label: string; Icon: typeof Shield }[] = [
    { id: "home", label: "Início", Icon: Shield },
    { id: "alerts", label: "Alertas", Icon: Bell },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 mx-auto w-full max-w-md border-t border-border bg-background/95 px-2 py-2 backdrop-blur">
      <ul className="flex items-stretch justify-around">
        {items.map(({ id, label, Icon }) => {
          const active = tab === id;
          return (
            <li key={id} className="flex-1">
              <button
                onClick={() => setTab(id)}
                className={`relative flex w-full flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] font-medium transition ${
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.2 : 1.8} />
                {label}
                {id === "alerts" && unread > 0 && (
                  <span className="absolute right-3 top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                    {unread > 99 ? "99+" : unread}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
