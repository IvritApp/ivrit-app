// =====================================================
// Hirbis — посредник до Telegram (Cloudflare Worker, бесплатно).
// Наш сервер в Москве не достаёт до api.telegram.org, а до Cloudflare — достаёт.
// Сервер шлёт запрос сюда: https://<имя>.workers.dev/bot<ключ>/<метод> → мы пересылаем его в Telegram.
//
// Чтобы чужие не пользовались посредником, пропускаем только нашего бота:
// в BOT_ID впиши ЦИФРЫ ДО ДВОЕТОЧИЯ из ключа бота (это номер бота, он не секретный).
// Сам ключ сюда НЕ вписывать — его знает только сервер.
// =====================================================
const BOT_ID = "ВПИШИ_ЦИФРЫ";

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/" || url.pathname === "") return new Response("hirbis tg proxy: ok");
    if (!url.pathname.startsWith("/bot" + BOT_ID + ":")) return new Response("forbidden", { status: 403 });
    const init = {
      method: request.method,
      headers: { "Content-Type": request.headers.get("Content-Type") || "application/json" },
    };
    if (request.method !== "GET" && request.method !== "HEAD") init.body = await request.arrayBuffer();
    const res = await fetch("https://api.telegram.org" + url.pathname + url.search, init);
    return new Response(res.body, { status: res.status, headers: { "Content-Type": res.headers.get("Content-Type") || "application/json" } });
  },
};
