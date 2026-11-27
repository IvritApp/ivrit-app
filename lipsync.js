// =====================================================
// ГУБЫ ПО ЗВУКУ (27.11). Персонаж-картинка (chars.js: кадры neutral / talk) открывает рот ровно тогда,
// когда в озвучке громко, и закрывает на паузах и в конце фразы — вместо ровного мигания «talk/neutral».
// Как: когда ttsPlayer (app.js) начинает играть файл, скачиваем тот же mp3 (он уже в кэше), раскладываем
// на громкость кусочками по 25 мс (decodeAudioData) и, пока звук идёт, по ttsPlayer.currentTime ставим
// говорящим персонажам класс lip-open. Сам звук играет как раньше через <audio> (на iPhone иначе может пропасть).
// Кто говорит — те .ci, у кого сейчас класс talking / act-talk (как и раньше). Класс lip-on выключает старое мигание.
// Фраза кончилась, а таймер «говорит» ещё идёт — рот закрыт и не мигает, пока персонаж не перестанет «говорить».
// Без файла озвучки (голос устройства) или если разобрать звук не вышло — всё по-старому (мигание).
// =====================================================
(function () {
  if (typeof ttsPlayer === "undefined" || !ttsPlayer) return;
  const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  if (!OAC) return;
  const STEP = 0.025;                     // кусочек звука, с
  const cache = new Map();                // адрес mp3 → громкость по кусочкам (0…1) или null (файл не разобрать)
  let decoder = null;
  let env = null, timer = 0, linger = 0, targets = [], since = 0, open = false;

  function decode(buf) {
    if (!decoder) decoder = new OAC(1, 22050, 22050);
    return new Promise((ok, bad) => {
      const p = decoder.decodeAudioData(buf, ok, bad);               // старый Safari понимает только вариант с колбэками
      if (p && p.catch) p.catch(bad);
    });
  }
  // громкость по кусочкам: RMS, сглаживание, деление на «громкий уровень» фразы (90-й процентиль)
  function envelope(ab) {
    const d = ab.getChannelData(0), n = Math.max(1, Math.round(ab.sampleRate * STEP)), out = new Float32Array(Math.ceil(d.length / n));
    for (let i = 0; i < out.length; i++) {
      let s = 0; const a = i * n, b = Math.min(d.length, a + n);
      for (let j = a; j < b; j += 2) s += d[j] * d[j];
      out[i] = Math.sqrt(s / Math.max(1, (b - a) / 2));
    }
    for (let i = 1; i < out.length - 1; i++) out[i] = (out[i - 1] + 2 * out[i] + out[i + 1]) / 4;
    const loud = Array.from(out).sort((x, y) => x - y)[Math.floor(out.length * 0.9)] || 1;
    for (let i = 0; i < out.length; i++) out[i] = Math.min(1, out[i] / loud);
    return out;
  }
  function remember(src, e) { if (cache.size > 80) cache.delete(cache.keys().next().value); cache.set(src, e); return e; }
  function load(src) {
    if (cache.has(src)) return Promise.resolve(cache.get(src));
    return fetch(src).then(r => r.ok ? r.arrayBuffer() : Promise.reject("net"))
      .then(buf => decode(buf).then(envelope).then(e => remember(src, e), () => remember(src, null)))   // не разобрать — больше не пробуем
      .catch(() => null);                                                                          // сеть подвела — в следующий раз попробуем снова
  }

  // говорящие сейчас персонажи (друг в уроке — .act-talk, люди в квестах и кат-сценах — .talking)
  const speakers = () => [...document.querySelectorAll(".talking .ci, .act-talk .ci, .ci.talking")].filter(el => !el.closest("[hidden]"));
  function setOpen(on) {
    if (on === open) return;
    open = on;
    targets.forEach(el => el.classList.toggle("lip-open", on));
  }
  // всё выключить (новая фраза, «Назад», пауза): старое мигание снова работает
  function stop() {
    clearTimeout(timer); timer = 0; clearInterval(linger); linger = 0;
    env = null; open = false; targets = [];
    document.querySelectorAll(".ci.lip-on, .ci.lip-open").forEach(el => el.classList.remove("lip-on", "lip-open"));
    document.body.classList.remove("lipsync");
  }
  // фраза кончилась: рот закрыт; lip-on держим, пока персонаж ещё «говорит» по своему таймеру (иначе он снова замигает)
  function finish() {
    clearTimeout(timer); timer = 0;
    setOpen(false); env = null;
    clearInterval(linger);
    linger = setInterval(() => {
      const now = speakers();
      document.querySelectorAll(".ci.lip-on").forEach(el => { if (!now.includes(el)) el.classList.remove("lip-on", "lip-open"); });
      if (!document.querySelector(".ci.lip-on")) stop();
    }, 200);
  }
  function tick() {
    timer = 0;
    if (!env || ttsPlayer.paused) return;
    // первые 0,6 с подхватываем тех, кто «заговорил» чуть позже звука (класс ставят рядом с speak())
    if (performance.now() - since < 600) speakers().forEach(el => { if (!targets.includes(el)) { targets.push(el); el.classList.add("lip-on"); if (open) el.classList.add("lip-open"); } });
    const v = env[Math.floor(ttsPlayer.currentTime / STEP)] || 0;
    setOpen(open ? v > 0.18 : v > 0.32);                               // с запасом: рот не дрожит на границе
    timer = setTimeout(tick, 33);                                      // ~30 раз в секунду (таймер, а не кадры экрана: в некоторых WebView кадры «засыпают»)
  }
  // файл озвучки начал грузиться: рот закрыт и не мигает по-старому, пока звук не заиграет (на телефоне это может быть заметная пауза)
  ttsPlayer.addEventListener("loadstart", () => {
    const src = ttsPlayer.currentSrc || ttsPlayer.src;
    if (!src || src.startsWith("data:")) return;
    stop();
    speakers().forEach(el => el.classList.add("lip-on"));
    const same = () => (ttsPlayer.currentSrc || ttsPlayer.src) === src;
    setTimeout(() => { if (!env && same()) speakers().forEach(el => el.classList.add("lip-on")); }, 120);   // друг в уроке «заговаривает» через 60 мс
    // звук так и не заиграл (не дали играть → говорит голос устройства) — вернуть старое мигание
    setTimeout(() => { if (!env && same() && ttsPlayer.paused) stop(); }, 2500);
  });
  ttsPlayer.addEventListener("error", stop);                           // файл не загрузился — говорит устройство, рот мигает как раньше
  ttsPlayer.addEventListener("playing", () => {
    const src = ttsPlayer.currentSrc || ttsPlayer.src;
    if (!src || src.startsWith("data:")) return;                       // «разблокировка» тишиной на iPhone
    load(src).then(e => {
      if ((ttsPlayer.currentSrc || ttsPlayer.src) !== src) return;     // уже другая фраза — ею займётся её собственный «playing»
      if (!e || ttsPlayer.paused) { stop(); return; }                  // разобрать звук не вышло — старое мигание
      stop();                                                          // та же фраза могла запуститься дважды — начинаем с чистого листа
      env = e; since = performance.now();
      speakers().forEach(el => { targets.push(el); el.classList.add("lip-on"); });
      document.body.classList.add("lipsync");
      tick();
    });
  });
  ttsPlayer.addEventListener("ended", finish);
  ttsPlayer.addEventListener("pause", () => { if (!ttsPlayer.ended) stop(); });   // pause бывает и прямо перед ended
  ttsPlayer.addEventListener("emptied", stop);
  window.HLip = { load, stop };            // для проверки в консоли: HLip.load(адрес mp3).then(console.log)
})();
