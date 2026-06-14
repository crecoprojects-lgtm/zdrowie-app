# Co robić dalej — krok po kroku

> ✅ Firebase: projekt gotowy, web app dodana, Firestore włączony
> ✅ GitHub: repo utworzone, Codespace otwarty

---

## KROK 1 — Wrzuć pliki do Codespace

Przeciągnij pliki z pulpitu do Codespace. W terminalu:
```
npm install
```
Potem:
```
git add .
git commit -m "Pierwszy commit"
git push
```

---

## KROK 2 — Połącz Cloudflare z GitHubem

1. Wejdź na **https://dash.cloudflare.com/**
2. W menu po lewej kliknij **Workers & Pages**
3. Kliknij **Create** → zakładka **Pages** → **Connect to Git**
4. Wybierz swoje repo **zdrowie-app**
5. Ustawienia builda:
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
6. Kliknij **Save and Deploy**
7. Poczekaj aż się zbuduje — gotowe! 🎉

Adres aplikacji: **`https://zdrowie-app.pages.dev`**

Od teraz każdy push na GitHub = automatyczny deploy.

---

## KROK 3 — Wgraj reguły Firestore

1. Firebase Console → Firestore Database → zakładka **Rules**
2. Zaznacz cały tekst (Ctrl+A), usuń
3. Otwórz plik `firestore.rules` z projektu, skopiuj całość
4. Wklej w Firebase i kliknij **Opublikuj**

---

## KROK 4 — Włącz logowanie anonimowe

1. Firebase Console → **Authentication** → **Get started**
2. Na liście metod: **Anonymous** (na dole) → włącz → **Zapisz**

---

## ✅ GOTOWE!

Aplikacja działa pod `https://zdrowie-app.pages.dev`, łączy się z Firebase, i auto-deployuje po każdym pushu.
