// ==========================================
// PWA ZDROWIE - WIDŻET IOS (SCRIPTABLE)
// ==========================================
// 1. Pobierz darmową aplikację "Scriptable" z App Store na swojego iPhone'a.
// 2. Skopiuj całą zawartość tego pliku i wklej jako nowy skrypt w aplikacji.
// 3. Uzupełnij zmienne FIREBASE_API_KEY, PROJECT_ID oraz PROFILE_ID swoimi danymi.
// 4. Dodaj Duży Widżet "Scriptable" na ekran domowy i przypisz mu ten skrypt.

const FIREBASE_API_KEY = "AIzaSyAl2uYOtsDWI1-L-3p0idsnqzyRASdo-eE";
const PROJECT_ID = "zdrowie-app";
const PROFILE_ID = "Wpisz_Swoj_Profile_ID"; // ID można sprawdzić np. patrząc w konsolę lub tabele Firestore

const PWA_URL = "https://zdrowie-app.TWOJA-NAZWA.workers.dev"; // URL Twojej aplikacji po wdrożeniu na Cloudflare

async function createWidget() {
  let widget = new ListWidget();
  
  // Tło i styl z aplikacji
  let gradient = new LinearGradient();
  gradient.locations = [0, 1];
  gradient.colors = [new Color("#00478d"), new Color("#002113")];
  widget.backgroundGradient = gradient;
  
  let headerStack = widget.addStack();
  let title = headerStack.addText("💊 Twój Plan Leków");
  title.textColor = Color.white();
  title.font = Font.boldSystemFont(22);
  widget.addSpacer(12);

  try {
    // 1. Anonimowe logowanie do Firebase
    let authReq = new Request(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`);
    authReq.method = "POST";
    authReq.headers = { "Content-Type": "application/json" };
    authReq.body = JSON.stringify({ returnSecureToken: true });
    let authRes = await authReq.loadJSON();
    let token = authRes.idToken;

    // 2. Pobieranie danych
    let url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/profiles/${PROFILE_ID}/doses`;
    let req = new Request(url);
    req.headers = { "Authorization": `Bearer ${token}` };
    let data = await req.loadJSON();

    let today = new Date().toISOString().split('T')[0];
    let slots = { rano: { total: 0, taken: 0 }, poludnie: { total: 0, taken: 0 }, wieczor: { total: 0, taken: 0 } };

    if (data.documents) {
      data.documents.forEach(doc => {
        let fields = doc.fields;
        if (fields && fields.date.stringValue === today) {
          let timeOfDay = fields.timeOfDay.stringValue;
          let isTaken = fields.taken.booleanValue;
          
          if (slots[timeOfDay] !== undefined) {
            slots[timeOfDay].total += 1;
            if (isTaken) slots[timeOfDay].taken += 1;
          }
        }
      });
    }

    // Generator wiersza dla pory dnia
    function addSlotRow(parent, label, icon, slotData, actionKey) {
      let row = parent.addStack();
      row.centerAlignContent();
      row.backgroundColor = new Color("#ffffff", 0.15);
      row.cornerRadius = 12;
      row.setPadding(12, 16, 12, 16);
      
      let iconText = row.addText(icon);
      iconText.font = Font.systemFont(24);
      row.addSpacer(10);
      
      let vStack = row.addStack();
      vStack.layoutVertically();
      
      let nameText = vStack.addText(label);
      nameText.textColor = Color.white();
      nameText.font = Font.boldSystemFont(16);
      
      let statusText = vStack.addText(slotData.total === 0 ? "Brak zaleceń" : `${slotData.taken} / ${slotData.total} zażyte`);
      statusText.textColor = new Color("#6cf8bb");
      statusText.font = Font.systemFont(12);
      
      row.addSpacer();
      
      if (slotData.total > 0 && slotData.taken < slotData.total) {
        let btn = row.addText("🟢 Oznacz");
        btn.font = Font.boldSystemFont(14);
        btn.textColor = new Color("#6cf8bb");
        row.url = `${PWA_URL}/?widget_action=take_all&slot=${actionKey}`;
      } else if (slotData.total > 0 && slotData.taken === slotData.total) {
        let done = row.addText("✅");
        done.font = Font.systemFont(18);
        row.url = PWA_URL; 
      }
      
      parent.addSpacer(8);
    }

    addSlotRow(widget, "Rano", "☀️", slots.rano, "rano");
    addSlotRow(widget, "Południe", "🌤", slots.poludnie, "poludnie");
    addSlotRow(widget, "Wieczór", "🌙", slots.wieczor, "wieczor");

  } catch (err) {
    let errText = widget.addText("Błąd autoryzacji z bazą Firebase.");
    errText.textColor = Color.red();
  }

  // Automatyczne odświeżanie
  let refreshDate = new Date();
  refreshDate.setMinutes(refreshDate.getMinutes() + 10);
  widget.refreshAfterDate = refreshDate;

  return widget;
}

let widget = await createWidget();
if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  widget.presentLarge();
}
Script.complete();
