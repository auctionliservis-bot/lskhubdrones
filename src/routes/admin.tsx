import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { toast } from "sonner";
import { Loader2, LogOut, Download, Flame, Sparkles, FileText, Trash2 } from "lucide-react";
import { type SurveyRow, answersOf, frequency, isHotLead, surveyFor } from "@/lib/admin-analytics";
import { rowsToCSV, contactsToCSV, downloadFile, buildTextReport } from "@/lib/admin-export";
import { checkAdminAccess, deleteAllSurveyResponses, getAdminSurveyResponses } from "@/lib/admin.functions";
import { AGRO_SURVEY, INDUSTRY_SURVEY } from "@/lib/survey-questions";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Админ · Lisakovsk HUB Drone & AI Lab" }] }),
  component: AdminPage,
});

const CHART_COLORS = ["oklch(0.55 0.18 250)", "oklch(0.68 0.16 165)", "oklch(0.7 0.15 210)", "oklch(0.75 0.14 90)", "oklch(0.62 0.2 320)"];

function AdminPage() {
  const [session, setSession] = useState<{ userId: string } | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);
  const checkAdmin = useServerFn(checkAdminAccess);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s?.user ? { userId: s.user.id } : null);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session?.user ? { userId: data.session.user.id } : null);
      setChecking(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.userId) { setIsAdmin(null); return; }
    let cancelled = false;
    setIsAdmin(null);
    checkAdmin()
      .then(({ isAdmin }) => {
        if (!cancelled) setIsAdmin(isAdmin);
      })
      .catch((error) => {
        if (cancelled) return;
        toast.error(error instanceof Error ? error.message : "Не удалось проверить доступ");
        setIsAdmin(false);
      });
    return () => { cancelled = true; };
  }, [session?.userId]);

  if (checking) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  if (!session) return <AuthScreen />;
  if (isAdmin === null) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  if (!isAdmin) return <NotAdminScreen />;
  return <AdminDashboard />;
}

function AuthScreen() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const fn = mode === "login"
      ? supabase.auth.signInWithPassword({ email, password })
      : supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + "/admin" } });
    const { error } = await fn;
    setBusy(false);
    if (error) toast.error(error.message);
    else if (mode === "signup") toast.success("Аккаунт создан. Первый зарегистрированный пользователь становится администратором.");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-subtle-gradient px-4">
      <Card className="w-full max-w-sm p-6 shadow-soft">
        <h1 className="font-bold text-xl mb-1">Lisakovsk HUB · Админ</h1>
        <p className="text-xs text-muted-foreground mb-5">Drone &amp; AI Lab — внутренняя панель</p>
        <form onSubmit={handle} className="space-y-3">
          <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input type="password" placeholder="Пароль" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          <Button type="submit" disabled={busy} className="w-full bg-hero-gradient">
            {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {mode === "login" ? "Войти" : "Создать аккаунт"}
          </Button>
        </form>
        <button onClick={() => setMode(mode === "login" ? "signup" : "login")} className="text-xs text-muted-foreground hover:text-foreground mt-4 w-full text-center">
          {mode === "login" ? "Создать аккаунт администратора" : "Уже есть аккаунт — войти"}
        </button>
      </Card>
    </div>
  );
}

function NotAdminScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="p-6 max-w-sm text-center">
        <h1 className="font-semibold mb-2">Нет доступа</h1>
        <p className="text-sm text-muted-foreground mb-4">У вашего аккаунта нет прав администратора.</p>
        <Button variant="outline" onClick={() => supabase.auth.signOut()}>Выйти</Button>
      </Card>
    </div>
  );
}

function AdminDashboard() {
  const [rows, setRows] = useState<SurveyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const getResponses = useServerFn(getAdminSurveyResponses);
  const deleteAll = useServerFn(deleteAllSurveyResponses);

  const load = () => {
    setLoading(true);
    getResponses()
      .then(({ rows }) => setRows(rows))
      .catch((e) => toast.error(e instanceof Error ? e.message : "Не удалось загрузить ответы"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleReset = async () => {
    if (!window.confirm("Удалить ВСЕ ответы? Действие необратимо.")) return;
    setResetting(true);
    try {
      const { deleted } = await deleteAll({});
      toast.success(`Удалено записей: ${deleted}`);
      setRows([]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Не удалось удалить");
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-subtle-gradient">
      <header className="border-b border-border bg-card sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <div className="font-bold text-sm">Lisakovsk HUB · Админ</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Drone &amp; AI Lab</div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleReset} disabled={resetting || rows.length === 0} className="text-destructive hover:text-destructive">
              {resetting ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Trash2 className="w-4 h-4 mr-1.5" />}
              Обнулить все ответы
            </Button>
            <Button variant="ghost" size="sm" onClick={() => supabase.auth.signOut()}>
              <LogOut className="w-4 h-4 mr-1.5" /> Выйти
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-7xl">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <Tabs defaultValue="overview">
            <TabsList className="flex flex-wrap h-auto">
              <TabsTrigger value="overview">Обзор</TabsTrigger>
              <TabsTrigger value="agro">Сельское хозяйство</TabsTrigger>
              <TabsTrigger value="industry">Промышленность</TabsTrigger>
              <TabsTrigger value="all">Все ответы</TabsTrigger>
              <TabsTrigger value="analytics">Аналитика и выводы</TabsTrigger>
              <TabsTrigger value="export">Экспорт</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="mt-6"><OverviewTab rows={rows} /></TabsContent>
            <TabsContent value="agro" className="mt-6"><SegmentTab rows={rows.filter((r) => r.survey_type === "agro")} type="agro" /></TabsContent>
            <TabsContent value="industry" className="mt-6"><SegmentTab rows={rows.filter((r) => r.survey_type === "industry")} type="industry" /></TabsContent>
            <TabsContent value="all" className="mt-6"><AllResponsesTab rows={rows} /></TabsContent>
            <TabsContent value="analytics" className="mt-6"><AnalyticsTab rows={rows} /></TabsContent>
            <TabsContent value="export" className="mt-6"><ExportTab rows={rows} /></TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <Card className={`p-4 shadow-card ${accent ? "border-primary/40 bg-primary/5" : ""}`}>
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </Card>
  );
}

function OverviewTab({ rows }: { rows: SurveyRow[] }) {
  const agro = rows.filter((r) => r.survey_type === "agro").length;
  const ind = rows.filter((r) => r.survey_type === "industry").length;
  const pilot = rows.filter((r) => r.interested_in_pilot).length;
  const training = rows.filter((r) => r.interested_in_training).length;
  const results = rows.filter((r) => r.wants_results).length;
  const contact = rows.filter((r) => r.phone_or_contact).length;
  const hot = rows.filter(isHotLead).length;

  const typeData = [{ name: "Агро", value: agro }, { name: "Промышленность", value: ind }];
  const droneInterest = [
    ...frequency(rows.filter((r) => r.survey_type === "agro"), "q11_pilot_interest"),
  ];
  const pilotReady = frequency(rows.filter((r) => r.survey_type === "industry"), "q18_pilot");
  const pains = [
    ...frequency(rows.filter((r) => r.survey_type === "agro"), "q9_difficulties").slice(0, 5),
    ...frequency(rows.filter((r) => r.survey_type === "industry"), "q9_difficulties").slice(0, 5),
  ].slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Всего ответов" value={rows.length} accent />
        <Stat label="Сельхозники" value={agro} />
        <Stat label="Промышленники" value={ind} />
        <Stat label="Готовы к пилоту" value={pilot} />
        <Stat label="Интересно обучение" value={training} />
        <Stat label="Хотят результаты" value={results} />
        <Stat label="Оставили контакт" value={contact} />
        <Stat label="🔥 Горячих контактов" value={hot} accent />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <ChartCard title="Распределение по типам">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={typeData} dataKey="value" nameKey="name" outerRadius={80} label>
                {typeData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
              </Pie>
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Уровень интереса агро к дронам">
          <FreqChart data={droneInterest} />
        </ChartCard>

        <ChartCard title="Готовность промышленников к пилоту">
          <FreqChart data={pilotReady} />
        </ChartCard>

        <ChartCard title="Основные боли (агро + промышленность, топ-8)">
          <FreqChart data={pains} />
        </ChartCard>
      </div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-4 shadow-card">
      <h3 className="font-medium text-sm mb-3">{title}</h3>
      {children}
    </Card>
  );
}

function FreqChart({ data }: { data: { label: string; count: number }[] }) {
  if (data.length === 0) return <p className="text-xs text-muted-foreground py-8 text-center">Нет данных</p>;
  return (
    <ResponsiveContainer width="100%" height={Math.max(200, data.length * 28)}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
        <YAxis type="category" dataKey="label" width={180} tick={{ fontSize: 11 }} />
        <Tooltip />
        <Bar dataKey="count" fill={CHART_COLORS[0]} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function SegmentTab({ rows, type }: { rows: SurveyRow[]; type: "agro" | "industry" }) {
  const def = type === "agro" ? AGRO_SURVEY : INDUSTRY_SURVEY;
  const contacts = rows.filter((r) => r.interested_in_pilot && r.phone_or_contact);

  // Choose key questions to visualize per segment
  const chartQs = type === "agro"
    ? ["q4_crops", "q5_area", "q6_methods", "q9_difficulties", "q11_pilot_interest", "q12_interest_areas", "q14_trust", "q17_test_area"]
    : ["q3_sphere", "q5_territories", "q6_tasks", "q7_current_solution", "q9_difficulties", "q10_3d_interest", "q11_services", "q15_safety", "q18_pilot", "q19_test_object", "q23_training"];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Ответов" value={rows.length} accent />
        <Stat label="Готовы к пилоту" value={rows.filter((r) => r.interested_in_pilot).length} />
        <Stat label="Хотят результаты" value={rows.filter((r) => r.wants_results).length} />
        <Stat label="Оставили контакт" value={rows.filter((r) => r.phone_or_contact).length} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {chartQs.map((qid) => {
          const q = def.questions.find((qq) => qq.id === qid);
          if (!q) return null;
          return <ChartCard key={qid} title={q.label}><FreqChart data={frequency(rows, qid)} /></ChartCard>;
        })}
      </div>

      <Card className="p-4 shadow-card">
        <h3 className="font-medium text-sm mb-3 flex items-center gap-2"><Flame className="w-4 h-4 text-orange-500" /> Контакты, готовые к разговору о пилоте</h3>
        {contacts.length === 0 ? <p className="text-xs text-muted-foreground">Пока нет</p> : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Организация</TableHead><TableHead>Имя</TableHead><TableHead>Локация</TableHead><TableHead>Контакт</TableHead></TableRow></TableHeader>
              <TableBody>
                {contacts.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.organization_name ?? "—"}</TableCell>
                    <TableCell>{r.respondent_name ?? "—"}</TableCell>
                    <TableCell>{r.location ?? "—"}</TableCell>
                    <TableCell>{r.phone_or_contact}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}

function AllResponsesTab({ rows }: { rows: SurveyRow[] }) {
  const [type, setType] = useState<string>("all");
  const [pilot, setPilot] = useState<string>("all");
  const [training, setTraining] = useState<string>("all");
  const [hasContact, setHasContact] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<SurveyRow | null>(null);

  const filtered = useMemo(() => rows.filter((r) => {
    if (type !== "all" && r.survey_type !== type) return false;
    if (pilot === "yes" && !r.interested_in_pilot) return false;
    if (pilot === "no" && r.interested_in_pilot) return false;
    if (training === "yes" && !r.interested_in_training) return false;
    if (training === "no" && r.interested_in_training) return false;
    if (hasContact === "yes" && !r.phone_or_contact) return false;
    if (hasContact === "no" && r.phone_or_contact) return false;
    if (search) {
      const s = search.toLowerCase();
      const hay = [r.organization_name, r.location, r.respondent_name, r.phone_or_contact].filter(Boolean).join(" ").toLowerCase();
      if (!hay.includes(s)) return false;
    }
    return true;
  }), [rows, type, pilot, training, hasContact, search]);

  return (
    <div className="space-y-4">
      <Card className="p-4 shadow-card">
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-2">
          <Select value={type} onValueChange={setType}><SelectTrigger><SelectValue placeholder="Тип" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Все типы</SelectItem><SelectItem value="agro">Агро</SelectItem><SelectItem value="industry">Промышленность</SelectItem></SelectContent>
          </Select>
          <Select value={pilot} onValueChange={setPilot}><SelectTrigger><SelectValue placeholder="Пилот" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Пилот: все</SelectItem><SelectItem value="yes">Готовы</SelectItem><SelectItem value="no">Нет</SelectItem></SelectContent>
          </Select>
          <Select value={training} onValueChange={setTraining}><SelectTrigger><SelectValue placeholder="Обучение" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Обучение: все</SelectItem><SelectItem value="yes">Интересно</SelectItem><SelectItem value="no">Нет</SelectItem></SelectContent>
          </Select>
          <Select value={hasContact} onValueChange={setHasContact}><SelectTrigger><SelectValue placeholder="Контакт" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Контакт: все</SelectItem><SelectItem value="yes">Оставлен</SelectItem><SelectItem value="no">Нет</SelectItem></SelectContent>
          </Select>
          <Input placeholder="Поиск: организация, район, имя…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="text-xs text-muted-foreground mt-3">Найдено: {filtered.length}</div>
      </Card>

      <Card className="shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Дата</TableHead><TableHead>Тип</TableHead><TableHead>Организация</TableHead>
                <TableHead>Локация</TableHead><TableHead>Имя</TableHead><TableHead>Контакт</TableHead><TableHead>Метки</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id} className="cursor-pointer" onClick={() => setSelected(r)}>
                  <TableCell className="text-xs whitespace-nowrap">{new Date(r.created_at).toLocaleString("ru-RU")}</TableCell>
                  <TableCell><Badge variant={r.survey_type === "agro" ? "secondary" : "default"}>{r.survey_type === "agro" ? "Агро" : "Пром"}</Badge></TableCell>
                  <TableCell className="font-medium max-w-[200px] truncate">{r.organization_name ?? "—"}</TableCell>
                  <TableCell className="max-w-[140px] truncate">{r.location ?? "—"}</TableCell>
                  <TableCell className="max-w-[140px] truncate">{r.respondent_name ?? "—"}</TableCell>
                  <TableCell className="max-w-[140px] truncate">{r.phone_or_contact ?? "—"}</TableCell>
                  <TableCell className="space-x-1 whitespace-nowrap">
                    {isHotLead(r) && <Badge className="bg-orange-500 hover:bg-orange-500"><Flame className="w-3 h-3 mr-0.5" />Горячий</Badge>}
                    {r.interested_in_pilot && <Badge variant="outline">Пилот</Badge>}
                    {r.interested_in_training && <Badge variant="outline">Обуч.</Badge>}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">Ничего не найдено</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selected && <ResponseDetail row={selected} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ResponseDetail({ row }: { row: SurveyRow }) {
  const def = surveyFor(row);
  const a = answersOf(row);
  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          {def.title}
          {isHotLead(row) && <Badge className="bg-orange-500 hover:bg-orange-500"><Flame className="w-3 h-3 mr-0.5" />Горячий</Badge>}
        </DialogTitle>
      </DialogHeader>
      <div className="text-xs text-muted-foreground mb-4">{new Date(row.created_at).toLocaleString("ru-RU")}</div>
      <div className="space-y-3">
        {def.questions.map((q, i) => {
          const v = a[q.id];
          const display = Array.isArray(v) ? v.join(", ") : (v ?? "—");
          return (
            <div key={q.id} className="border-b border-border pb-2">
              <div className="text-xs text-muted-foreground"><span className="text-primary font-medium">{i + 1}.</span> {q.label}</div>
              <div className="text-sm mt-1">{display || "—"}</div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function AnalyticsTab({ rows }: { rows: SurveyRow[] }) {
  const agro = rows.filter((r) => r.survey_type === "agro");
  const ind = rows.filter((r) => r.survey_type === "industry");
  const hot = rows.filter(isHotLead);
  const training = rows.filter((r) => r.interested_in_training);

  const top = (data: { label: string; count: number }[], n = 3) => data.slice(0, n).map((d) => `«${d.label}» (${d.count})`).join(", ") || "—";

  return (
    <div className="space-y-4">
      <Card className="p-5 shadow-card">
        <h3 className="font-semibold mb-3 flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /> Главные выводы</h3>
        <div className="space-y-3 text-sm leading-relaxed">
          <p><strong>Сельское хозяйство ({agro.length}):</strong> главные сложности — {top(frequency(agro, "q9_difficulties"))}. Наибольший интерес вызывает: {top(frequency(agro, "q12_interest_areas"))}.</p>
          <p><strong>Промышленность ({ind.length}):</strong> ключевые задачи — {top(frequency(ind, "q6_tasks"))}. Востребованные услуги: {top(frequency(ind, "q11_services"))}.</p>
          <p><strong>Часто повторяющиеся сомнения / барьеры:</strong> агро — {top(frequency(agro, "q14_trust"))}; промышленность — {top(frequency(ind, "q15_safety"))}.</p>
          <p><strong>Направления обучения:</strong> {top(frequency(ind, "q24_specialists"))}.</p>
          <p><strong>Приоритетные направления:</strong> начать с тех услуг, которые повторяются у наибольшего числа респондентов и где есть готовность к пилоту.</p>
        </div>
      </Card>

      <Card className="p-5 shadow-card">
        <h3 className="font-semibold mb-3 flex items-center gap-2"><Flame className="w-4 h-4 text-orange-500" /> Потенциальные клиенты для пилота ({hot.length})</h3>
        {hot.length === 0 ? <p className="text-xs text-muted-foreground">Пока нет горячих контактов.</p> : (
          <ul className="text-sm space-y-1.5">
            {hot.map((r) => (
              <li key={r.id} className="flex justify-between gap-3 border-b border-border pb-1.5">
                <span><Badge variant={r.survey_type === "agro" ? "secondary" : "default"} className="mr-2">{r.survey_type === "agro" ? "Агро" : "Пром"}</Badge>{r.organization_name ?? "—"} — {r.respondent_name ?? "—"}, {r.location ?? "—"}</span>
                <span className="text-muted-foreground whitespace-nowrap">{r.phone_or_contact}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-5 shadow-card">
        <h3 className="font-semibold mb-3">Потенциальные партнёры для обучения ({training.length})</h3>
        {training.length === 0 ? <p className="text-xs text-muted-foreground">Пока нет.</p> : (
          <ul className="text-sm space-y-1.5">
            {training.map((r) => (
              <li key={r.id} className="border-b border-border pb-1.5">{r.organization_name ?? "—"} · {r.location ?? "—"} {r.phone_or_contact && <span className="text-muted-foreground">— {r.phone_or_contact}</span>}</li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-5 shadow-card bg-accent/40">
        <h3 className="font-semibold mb-2 flex items-center gap-2"><FileText className="w-4 h-4" /> Краткий отчёт</h3>
        <p className="text-xs text-muted-foreground mb-3">Сгенерировать текстовую сводку: количество ответов, боли, интерес, готовность к пилоту, рекомендации.</p>
        <Button onClick={() => downloadFile(buildTextReport(rows), `lisakovsk-hub-report-${new Date().toISOString().slice(0, 10)}.txt`, "text/plain;charset=utf-8")} className="bg-hero-gradient">
          <Download className="w-4 h-4 mr-2" /> Сгенерировать краткий отчёт
        </Button>
      </Card>
    </div>
  );
}

function ExportTab({ rows }: { rows: SurveyRow[] }) {
  const agro = rows.filter((r) => r.survey_type === "agro");
  const ind = rows.filter((r) => r.survey_type === "industry");
  const today = new Date().toISOString().slice(0, 10);

  const items = [
    { title: "Все ответы (CSV)", desc: `${rows.length} записей`, action: () => downloadFile(rowsToCSV(rows), `lisakovsk-all-${today}.csv`) },
    { title: "Ответы сельхозников (CSV)", desc: `${agro.length} записей`, action: () => downloadFile(rowsToCSV(agro), `lisakovsk-agro-${today}.csv`) },
    { title: "Ответы промышленников (CSV)", desc: `${ind.length} записей`, action: () => downloadFile(rowsToCSV(ind), `lisakovsk-industry-${today}.csv`) },
    { title: "Список контактов (CSV)", desc: `${rows.filter((r) => r.phone_or_contact).length} контактов`, action: () => downloadFile(contactsToCSV(rows), `lisakovsk-contacts-${today}.csv`) },
    { title: "Краткий отчёт (TXT)", desc: "Сводный текстовый отчёт", action: () => downloadFile(buildTextReport(rows), `lisakovsk-report-${today}.txt`, "text/plain;charset=utf-8") },
  ];

  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {items.map((it) => (
        <Card key={it.title} className="p-5 shadow-card flex items-center justify-between gap-3">
          <div>
            <div className="font-medium">{it.title}</div>
            <div className="text-xs text-muted-foreground">{it.desc}</div>
          </div>
          <Button variant="outline" onClick={it.action}><Download className="w-4 h-4 mr-2" />Скачать</Button>
        </Card>
      ))}
    </div>
  );
}
