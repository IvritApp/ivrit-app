// =====================================================
// Hirbis — посредник до Telegram (Cloudflare Worker, бесплатно).
// Наш сервер в Москве не достаёт до api.telegram.org, а до Cloudflare — достаёт.
// Сервер шлёт запрос сюда: https://<имя>.workers.dev/bot<ключ>/<метод> → мы пересылаем его в Telegram.
// Файлы (скачивание фото/документов): https://<имя>.workers.dev/file/bot<ключ>/<путь>.
//
// Чтобы чужие не пользовались посредником, пропускаем только СВОИХ ботов:
// в BOT_IDS впиши номера ботов — ЦИФРЫ ДО ДВОЕТОЧИЯ из ключа каждого бота (номер не секретный).
// Сами ключи сюда НЕ вписывать — их знает только сервер.
// 25.11: стало списком — второй бот (Secret Santa) ходит через тот же посредник.
// =====================================================
const BOT_IDS = ["ЦИФРЫ_HIRBIS_BOT", "ЦИФРЫ_SANTA_BOT"];

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/" || url.pathname === "") return new Response("hirbis tg proxy: ok");
    const m = url.pathname.match(/^\/(?:file\/)?bot(\d+):/);          // /bot<номер>:<…>/метод  или  /file/bot<номер>:<…>/путь
    if (!m || !BOT_IDS.includes(m[1])) return new Response("forbidden", { status: 403 });
    const init = {
      method: request.method,
      // Content-Type как есть — у aiogram это может быть multipart/form-data с boundary (отправка файлов)
      headers: { "Content-Type": request.headers.get("Content-Type") || "application/json" },
    };
    if (request.method !== "GET" && request.method !== "HEAD") init.body = await request.arrayBuffer();
    const res = await fetch("https://api.telegram.org" + url.pathname + url.search, init);
    return new Response(res.body, { status: res.status, headers: { "Content-Type": res.headers.get("Content-Type") || "application/json" } });
  },
};
